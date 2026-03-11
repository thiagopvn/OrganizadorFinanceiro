/**
 * Unity Finance — Cloud Functions (v1 API)
 *
 * Funções serverless para o app de gestão financeira para casais.
 * Inclui triggers do Firestore, Storage e tarefas agendadas (CRON).
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/**
 * Formata um valor numérico como moeda brasileira (R$).
 * @param {number} value - Valor a ser formatado.
 * @returns {string} Valor formatado em pt-BR (ex: "R$ 1.234,56").
 */
function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Envia notificação push via FCM para uma lista de tokens.
 * Tokens inválidos são removidos silenciosamente.
 *
 * @param {string[]} tokens - Lista de FCM tokens.
 * @param {string} title - Título da notificação.
 * @param {string} body - Corpo da notificação.
 * @returns {Promise<void>}
 */
async function sendPushNotification(tokens, title, body) {
  if (!tokens || tokens.length === 0) {
    functions.logger.warn("Nenhum token FCM disponível para envio de notificação.");
    return;
  }

  // Remove tokens duplicados / vazios
  const validTokens = [...new Set(tokens.filter(Boolean))];
  if (validTokens.length === 0) return;

  const message = {
    notification: { title, body },
    tokens: validTokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          functions.logger.warn(
            `Falha ao enviar para token ${validTokens[idx]}: ${resp.error?.message}`
          );
        }
      });
    }
    functions.logger.info(
      `Notificação enviada — sucesso: ${response.successCount}, falhas: ${response.failureCount}`
    );
  } catch (error) {
    functions.logger.error("Erro ao enviar notificação push:", error);
  }
}

/**
 * Cria um documento na subcoleção de notificações do casal.
 *
 * @param {object} params
 * @param {string} params.userId - ID do usuário destinatário.
 * @param {string} params.coupleId - ID do casal.
 * @param {string} params.type - Tipo da notificação.
 * @param {string} params.title - Título.
 * @param {string} params.message - Mensagem.
 * @returns {Promise<FirebaseFirestore.DocumentReference>}
 */
async function createNotificationDoc({ userId, coupleId, type, title, message }) {
  return db
    .collection("couples")
    .doc(coupleId)
    .collection("notifications")
    .add({
      userId,
      coupleId,
      type,
      title,
      message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Busca todos os tokens FCM de um array de userIds.
 *
 * @param {string[]} userIds
 * @returns {Promise<{allTokens: string[], tokensByUser: Object.<string, string[]>, usersData: Object.<string, object>}>}
 */
async function getTokensForUsers(userIds) {
  const allTokens = [];
  const tokensByUser = {};
  const usersData = {};

  const userDocs = await Promise.all(
    userIds.map((uid) => db.collection("users").doc(uid).get())
  );

  userDocs.forEach((snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    const tokens = data.fcmTokens || [];
    tokensByUser[snap.id] = tokens;
    usersData[snap.id] = data;
    allTokens.push(...tokens);
  });

  return { allTokens, tokensByUser, usersData };
}

/**
 * Retorna o nome do mês em português a partir de um índice (0-11).
 * @param {number} monthIndex
 * @returns {string}
 */
function getMonthName(monthIndex) {
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return months[monthIndex];
}

// ---------------------------------------------------------------------------
// 1. onTransactionCreate — Trigger do Firestore
// ---------------------------------------------------------------------------

/**
 * Disparado quando uma nova transação é criada.
 *
 * Responsabilidades:
 *  - Atualizar o orçamento (spent) se for despesa compartilhada.
 *  - Verificar se ultrapassou algum limiar de alerta (50%, 80%, 100%).
 *  - Notificar o parceiro sobre a nova despesa.
 */
exports.onTransactionCreate = functions.firestore
  .document("couples/{coupleId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    if (!snap) {
      functions.logger.warn("Evento sem dados — ignorando.");
      return null;
    }

    const transaction = snap.data();
    const { coupleId } = context.params;

    functions.logger.info(
      `Nova transação criada para o casal ${coupleId}: ${JSON.stringify(transaction)}`
    );

    try {
      // Buscar dados do casal
      const coupleSnap = await db.collection("couples").doc(coupleId).get();
      if (!coupleSnap.exists) {
        functions.logger.error(`Casal ${coupleId} não encontrado.`);
        return null;
      }
      const coupleData = coupleSnap.data();
      const partnerIds = coupleData.partnerIds || [];

      // Buscar dados dos parceiros
      const { allTokens, tokensByUser, usersData } =
        await getTokensForUsers(partnerIds);

      // ---------------------------------------------------------------
      // Atualização de orçamento (apenas despesas compartilhadas)
      // ---------------------------------------------------------------
      if (transaction.amount < 0 && transaction.isShared) {
        const absAmount = Math.abs(transaction.amount);

        // Buscar orçamento correspondente à categoria
        const budgetQuery = await db
          .collection("couples")
          .doc(coupleId)
          .collection("budgets")
          .where("category", "==", transaction.category)
          .limit(1)
          .get();

        if (!budgetQuery.empty) {
          const budgetDoc = budgetQuery.docs[0];
          const budgetData = budgetDoc.data();
          const oldSpent = budgetData.spent || 0;
          const newSpent = oldSpent + absAmount;
          const limit = budgetData.limit || 0;

          // Atualizar o campo spent do orçamento
          await budgetDoc.ref.update({
            spent: admin.firestore.FieldValue.increment(absAmount),
          });

          functions.logger.info(
            `Orçamento "${transaction.category}" atualizado: ${oldSpent} → ${newSpent} (limite: ${limit})`
          );

          // Verificar limiares de alerta
          if (limit > 0) {
            const oldPercentage = (oldSpent / limit) * 100;
            const newPercentage = (newSpent / limit) * 100;
            const thresholds = budgetData.alertThresholds || [50, 80, 100];

            // Encontrar limiares que acabaram de ser ultrapassados
            const crossedThresholds = thresholds.filter(
              (t) => oldPercentage < t && newPercentage >= t
            );

            for (const threshold of crossedThresholds) {
              const icon = budgetData.icon || "💰";
              let alertTitle;
              let alertBody;

              if (threshold >= 100) {
                alertTitle = "Orçamento estourado!";
                alertBody =
                  `${icon} O orçamento de "${transaction.category}" atingiu ${Math.round(newPercentage)}% ` +
                  `(${formatCurrency(newSpent)} de ${formatCurrency(limit)}).`;
              } else {
                alertTitle = `Alerta de orçamento: ${threshold}%`;
                alertBody =
                  `${icon} O orçamento de "${transaction.category}" atingiu ${threshold}% ` +
                  `(${formatCurrency(newSpent)} de ${formatCurrency(limit)}).`;
              }

              // Enviar push para ambos os parceiros
              await sendPushNotification(allTokens, alertTitle, alertBody);

              // Criar documento de notificação para cada parceiro
              const notificationPromises = partnerIds.map((uid) =>
                createNotificationDoc({
                  userId: uid,
                  coupleId,
                  type: "budget_alert",
                  title: alertTitle,
                  message: alertBody,
                })
              );
              await Promise.all(notificationPromises);

              functions.logger.info(
                `Alerta de orçamento (${threshold}%) enviado para o casal ${coupleId}.`
              );
            }
          }
        } else {
          functions.logger.info(
            `Nenhum orçamento encontrado para a categoria "${transaction.category}".`
          );
        }
      }

      // ---------------------------------------------------------------
      // Notificar o parceiro sobre a nova despesa
      // ---------------------------------------------------------------
      if (transaction.amount < 0) {
        const paidBy = transaction.paidBy;
        const otherPartner = partnerIds.find((uid) => uid !== paidBy);

        if (otherPartner) {
          const paidByUser = usersData[paidBy];
          const paidByName =
            paidByUser?.displayName || "Seu parceiro(a)";
          const absAmount = Math.abs(transaction.amount);

          const notifTitle = "Nova despesa adicionada";
          const notifBody =
            `${paidByName} adicionou ${formatCurrency(absAmount)} em ${transaction.category}`;

          // Push para o outro parceiro
          const otherTokens = tokensByUser[otherPartner] || [];
          await sendPushNotification(otherTokens, notifTitle, notifBody);

          // Criar documento de notificação
          await createNotificationDoc({
            userId: otherPartner,
            coupleId,
            type: "new_expense",
            title: notifTitle,
            message: notifBody,
          });

          functions.logger.info(
            `Notificação de nova despesa enviada para o parceiro ${otherPartner}.`
          );
        }
      }

      return null;
    } catch (error) {
      functions.logger.error("Erro no onTransactionCreate:", error);
      return null;
    }
  });

// ---------------------------------------------------------------------------
// 2. predictiveBudgetAlert — CRON diário às 09:00 BRT
// ---------------------------------------------------------------------------

/**
 * Executa diariamente às 09:00 (horário de Brasília).
 *
 * Para cada casal, analisa os orçamentos mensais ativos e projeta
 * se o gasto irá ultrapassar o limite até o fim do mês. Envia alertas
 * preditivos quando necessário.
 */
exports.predictiveBudgetAlert = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    functions.logger.info("Iniciando verificação preditiva de orçamentos.");

    try {
      const couplesSnap = await db.collection("couples").get();

      for (const coupleDoc of couplesSnap.docs) {
        const coupleId = coupleDoc.id;
        const coupleData = coupleDoc.data();
        const partnerIds = coupleData.partnerIds || [];

        // Buscar orçamentos mensais
        const budgetsSnap = await db
          .collection("couples")
          .doc(coupleId)
          .collection("budgets")
          .where("period", "==", "monthly")
          .get();

        if (budgetsSnap.empty) continue;

        // Calcular dias do mês
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0); // último dia do mês
        const totalDays = lastDay.getDate();

        // Dias decorridos (incluindo hoje)
        const daysElapsed = Math.max(
          1,
          Math.ceil((now.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24))
        );
        const daysRemaining = totalDays - daysElapsed;

        // Buscar tokens dos parceiros
        const { allTokens } = await getTokensForUsers(partnerIds);

        for (const budgetDoc of budgetsSnap.docs) {
          const budget = budgetDoc.data();
          const spent = budget.spent || 0;
          const limit = budget.limit || 0;

          if (limit <= 0 || spent <= 0) continue;

          // Taxa média diária de gasto
          const dailyRate = spent / daysElapsed;

          // Projeção de gasto total no mês
          const projectedTotal = dailyRate * totalDays;

          if (projectedTotal > limit) {
            // Calcular em quantos dias atingirá o limite
            const daysUntilLimit = Math.max(
              0,
              Math.ceil((limit - spent) / dailyRate)
            );

            const alertTitle = "Alerta preditivo de orçamento";
            const alertBody =
              daysUntilLimit > 0
                ? `No ritmo atual, vocês vão estourar a meta de ${budget.category} em ${daysUntilLimit} dias.`
                : `O orçamento de ${budget.category} já ultrapassou o limite de ${formatCurrency(limit)}.`;

            functions.logger.info(
              `Alerta preditivo para casal ${coupleId} — categoria "${budget.category}": ` +
              `gasto ${formatCurrency(spent)}, projeção ${formatCurrency(projectedTotal)}, ` +
              `limite ${formatCurrency(limit)}, dias restantes: ${daysRemaining}.`
            );

            // Enviar push para ambos os parceiros
            await sendPushNotification(allTokens, alertTitle, alertBody);

            // Criar documento de notificação para cada parceiro
            const notifPromises = partnerIds.map((uid) =>
              createNotificationDoc({
                userId: uid,
                coupleId,
                type: "ai_alert",
                title: alertTitle,
                message: alertBody,
              })
            );
            await Promise.all(notifPromises);
          }
        }
      }

      functions.logger.info("Verificação preditiva de orçamentos concluída.");
    } catch (error) {
      functions.logger.error("Erro no predictiveBudgetAlert:", error);
    }
  });

// ---------------------------------------------------------------------------
// 3. monthlySettlement — CRON no dia 1 de cada mês às 08:00 BRT
// ---------------------------------------------------------------------------

/**
 * Executa no 1.º dia de cada mês às 08:00 (horário de Brasília).
 *
 * Calcula o acerto financeiro entre os parceiros com base nas
 * transações compartilhadas do mês anterior, respeitando o splitRatio
 * definido pelo casal.
 */
exports.monthlySettlement = functions.pubsub
  .schedule("1 of month 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    functions.logger.info("Iniciando cálculo de acerto mensal.");

    try {
      const couplesSnap = await db.collection("couples").get();

      for (const coupleDoc of couplesSnap.docs) {
        const coupleId = coupleDoc.id;
        const coupleData = coupleDoc.data();
        const partnerIds = coupleData.partnerIds || [];
        const splitRatio = coupleData.splitRatio || {};

        if (partnerIds.length < 2) {
          functions.logger.warn(
            `Casal ${coupleId} possui menos de 2 parceiros — ignorando.`
          );
          continue;
        }

        // Determinar intervalo do mês anterior
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const periodLabel = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

        functions.logger.info(
          `Processando acerto do casal ${coupleId} para o período ${periodLabel}.`
        );

        // Buscar transações compartilhadas do mês anterior
        const txSnap = await db
          .collection("couples")
          .doc(coupleId)
          .collection("transactions")
          .where("isShared", "==", true)
          .where("date", ">=", admin.firestore.Timestamp.fromDate(prevMonth))
          .where("date", "<=", admin.firestore.Timestamp.fromDate(prevMonthEnd))
          .get();

        if (txSnap.empty) {
          functions.logger.info(
            `Nenhuma transação compartilhada encontrada para o casal ${coupleId} em ${periodLabel}.`
          );
          continue;
        }

        // Agrupar por categoria e calcular a divisão
        const categoryTotals = {}; // { category: totalAmount }
        const partnerBalances = {}; // { userId: saldoDevedor }

        // Inicializar saldos
        partnerIds.forEach((uid) => {
          partnerBalances[uid] = 0;
        });

        for (const txDoc of txSnap.docs) {
          const tx = txDoc.data();
          const absAmount = Math.abs(tx.amount);
          const category = tx.category || "outros";
          const paidBy = tx.paidBy;

          // Acumular total por categoria
          categoryTotals[category] = (categoryTotals[category] || 0) + absAmount;

          // Para cada parceiro, calcular quanto deveria ter pago
          for (const uid of partnerIds) {
            const ratio = (splitRatio[uid] || 50) / 100;
            const owes = absAmount * ratio;

            if (uid === paidBy) {
              // Quem pagou recebe crédito pelo que excede sua parte
              partnerBalances[uid] += absAmount - owes;
            } else {
              // Quem não pagou acumula dívida da sua parte
              partnerBalances[uid] -= owes;
            }
          }
        }

        // Determinar quem deve a quem
        // O parceiro com saldo negativo deve ao parceiro com saldo positivo
        const [userA, userB] = partnerIds;
        const balanceA = partnerBalances[userA];
        // Se balanceA > 0, userB deve a userA. Se balanceA < 0, userA deve a userB.

        let fromUser, toUser, netAmount;

        if (balanceA > 0) {
          // userB deve a userA
          fromUser = userB;
          toUser = userA;
          netAmount = Math.round(balanceA * 100) / 100; // arredondar centavos
        } else if (balanceA < 0) {
          // userA deve a userB
          fromUser = userA;
          toUser = userB;
          netAmount = Math.round(Math.abs(balanceA) * 100) / 100;
        } else {
          // Saldo zero — nenhum acerto necessário
          functions.logger.info(`Casal ${coupleId}: saldos zerados em ${periodLabel}.`);
          continue;
        }

        // Montar breakdown por categoria
        const breakdown = Object.entries(categoryTotals).map(
          ([category, totalAmount]) => ({
            category,
            totalAmount: Math.round(totalAmount * 100) / 100,
            splitType: coupleData.splitRule || "percentage",
          })
        );

        // Criar documento de acerto
        await db
          .collection("couples")
          .doc(coupleId)
          .collection("settlements")
          .add({
            period: periodLabel,
            fromUser,
            toUser,
            amount: netAmount,
            status: "pending",
            breakdown,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        functions.logger.info(
          `Acerto criado para o casal ${coupleId}: ${fromUser} deve ${formatCurrency(netAmount)} a ${toUser}.`
        );

        // Notificar ambos os parceiros
        const monthName = getMonthName(prevMonth.getMonth());
        const { allTokens } = await getTokensForUsers(partnerIds);

        const notifTitle = "Acerto mensal pronto";
        const notifBody = `O acerto de ${monthName} está pronto: ${formatCurrency(netAmount)}`;

        await sendPushNotification(allTokens, notifTitle, notifBody);

        const notifPromises = partnerIds.map((uid) =>
          createNotificationDoc({
            userId: uid,
            coupleId,
            type: "settlement",
            title: notifTitle,
            message: notifBody,
          })
        );
        await Promise.all(notifPromises);
      }

      functions.logger.info("Cálculo de acerto mensal concluído.");
    } catch (error) {
      functions.logger.error("Erro no monthlySettlement:", error);
    }
  });

// ---------------------------------------------------------------------------
// 4. processReceiptOCR — Trigger do Cloud Storage
// ---------------------------------------------------------------------------

/**
 * Mapa de palavras-chave para categorização automática de estabelecimentos.
 */
const MERCHANT_CATEGORY_MAP = {
  mercado: "mercado",
  supermercado: "mercado",
  super: "mercado",
  hortifruti: "mercado",
  atacadão: "mercado",
  atacadao: "mercado",
  restaurante: "restaurante",
  rest: "restaurante",
  bar: "restaurante",
  lanchonete: "restaurante",
  pizzaria: "restaurante",
  padaria: "restaurante",
  cafeteria: "restaurante",
  hamburgueria: "restaurante",
  sushi: "restaurante",
  churrascaria: "restaurante",
  farmacia: "saude",
  farmácia: "saude",
  drogaria: "saude",
  droga: "saude",
  hospital: "saude",
  clínica: "saude",
  clinica: "saude",
  laboratório: "saude",
  laboratorio: "saude",
  posto: "transporte",
  combustivel: "transporte",
  combustível: "transporte",
  gasolina: "transporte",
  estacionamento: "transporte",
  uber: "transporte",
  "99": "transporte",
  pedagio: "transporte",
  pedágio: "transporte",
  cinema: "lazer",
  teatro: "lazer",
  parque: "lazer",
  shopping: "lazer",
  livraria: "educacao",
  papelaria: "educacao",
  escola: "educacao",
  faculdade: "educacao",
  curso: "educacao",
  pet: "pet",
  veterinário: "pet",
  veterinario: "pet",
};

/**
 * Tenta extrair o valor total de um texto de nota fiscal.
 *
 * @param {string} text - Texto OCR da nota fiscal.
 * @returns {number|null} Valor encontrado ou null.
 */
function extractTotalAmount(text) {
  // Padrões comuns em notas fiscais brasileiras
  const patterns = [
    // "TOTAL R$ 123,45" ou "TOTAL: R$ 123,45"
    /TOTAL\s*:?\s*R?\$?\s*([\d.,]+)/i,
    // "VALOR TOTAL R$ 123,45"
    /VALOR\s*TOTAL\s*:?\s*R?\$?\s*([\d.,]+)/i,
    // "VALOR A PAGAR R$ 123,45"
    /VALOR\s*A\s*PAGAR\s*:?\s*R?\$?\s*([\d.,]+)/i,
    // "R$ 123,45" no final do texto (último valor encontrado é geralmente o total)
    /R\$\s*([\d.,]+)/gi,
  ];

  for (let i = 0; i < patterns.length - 1; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      return parseLocalCurrency(match[1]);
    }
  }

  // Último recurso: pegar o maior valor R$ encontrado (provável total)
  const allValues = [];
  let match;
  const globalPattern = /R\$\s*([\d.,]+)/gi;
  while ((match = globalPattern.exec(text)) !== null) {
    const value = parseLocalCurrency(match[1]);
    if (value !== null) allValues.push(value);
  }

  if (allValues.length > 0) {
    return Math.max(...allValues);
  }

  return null;
}

/**
 * Converte string de moeda brasileira para número.
 * Exemplos: "1.234,56" → 1234.56, "123,45" → 123.45
 *
 * @param {string} str
 * @returns {number|null}
 */
function parseLocalCurrency(str) {
  if (!str) return null;
  // Remover pontos de milhar, trocar vírgula por ponto
  const cleaned = str.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Tenta extrair o nome do estabelecimento do texto OCR.
 * Geralmente está nas primeiras linhas da nota fiscal.
 *
 * @param {string} text
 * @returns {string|null}
 */
function extractMerchant(text) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  // Pegar uma das primeiras linhas não-vazias que pareça um nome de estabelecimento
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    // Ignorar linhas que são claramente cabeçalhos técnicos (CNPJ, endereço numérico, etc.)
    if (/^\d{2}\.\d{3}\.\d{3}/.test(line)) continue; // CNPJ
    if (/^(CNPJ|CPF|IE|IM|SAT)\s*:/i.test(line)) continue;
    if (/^\d{5}-\d{3}/.test(line)) continue; // CEP

    // Se a linha tem pelo menos 3 caracteres e é predominantemente letras
    if (line.length >= 3 && /[a-zA-ZÀ-ú]/.test(line)) {
      return line;
    }
  }

  return null;
}

/**
 * Tenta extrair a data do texto OCR da nota fiscal.
 *
 * @param {string} text
 * @returns {Date|null}
 */
function extractDate(text) {
  // Padrões de data brasileiros: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{2})[\/\-](\d{2})[\/\-](\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);

      // Ajustar ano de 2 dígitos
      if (year < 100) {
        year += 2000;
      }

      // Validação básica
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
        return new Date(year, month, day);
      }
    }
  }

  return null;
}

/**
 * Tenta identificar a categoria com base no nome do estabelecimento.
 *
 * @param {string} merchantName
 * @returns {string|null}
 */
function categorizeByMerchant(merchantName) {
  if (!merchantName) return null;

  const normalized = merchantName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remover acentos para comparação

  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    const normalizedKeyword = keyword
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalized.includes(normalizedKeyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Disparado quando um arquivo é enviado para o bucket em
 * `receipts/{coupleId}/{transactionId}/{filename}`.
 *
 * Usa a API do Google Cloud Vision para OCR e extrai dados da nota fiscal,
 * atualizando a transação correspondente.
 */
exports.processReceiptOCR = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  // Verificar se o arquivo está no caminho esperado
  if (!filePath || !filePath.startsWith("receipts/")) {
    functions.logger.info(`Arquivo fora do escopo (${filePath}) — ignorando.`);
    return null;
  }

  // Validar tipo de conteúdo (apenas imagens e PDFs)
  if (contentType && !contentType.startsWith("image/") && contentType !== "application/pdf") {
    functions.logger.info(`Tipo de arquivo não suportado (${contentType}) — ignorando.`);
    return null;
  }

  // Extrair coupleId e transactionId do caminho
  const pathParts = filePath.split("/");
  // Esperado: receipts/{coupleId}/{transactionId}/{filename}
  if (pathParts.length < 4) {
    functions.logger.warn(`Caminho inesperado: ${filePath} — ignorando.`);
    return null;
  }

  const coupleId = pathParts[1];
  const transactionId = pathParts[2];

  functions.logger.info(
    `Processando nota fiscal: casal=${coupleId}, transação=${transactionId}, arquivo=${filePath}`
  );

  try {
    // Obter referência ao arquivo no Storage
    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(filePath);

    // Baixar o arquivo para um buffer temporário
    const [fileBuffer] = await file.download();

    // Usar Google Cloud Vision para OCR
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection({
      image: { content: fileBuffer },
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      functions.logger.warn(`Nenhum texto detectado na nota fiscal: ${filePath}`);
      return null;
    }

    // O primeiro resultado contém todo o texto detectado
    const fullText = detections[0].description || "";
    functions.logger.info(`Texto OCR extraído (${fullText.length} caracteres).`);

    // Extrair dados da nota fiscal
    const extractedAmount = extractTotalAmount(fullText);
    const extractedMerchant = extractMerchant(fullText);
    const extractedDate = extractDate(fullText);
    const extractedCategory = categorizeByMerchant(extractedMerchant);

    functions.logger.info(
      `Dados extraídos — valor: ${extractedAmount}, ` +
      `estabelecimento: ${extractedMerchant}, ` +
      `data: ${extractedDate}, ` +
      `categoria: ${extractedCategory}`
    );

    // Montar objeto de atualização (apenas campos que foram extraídos)
    const updateData = {};

    if (extractedAmount !== null) {
      // Despesas são negativas no sistema
      updateData.amount = -Math.abs(extractedAmount);
    }
    if (extractedMerchant) {
      updateData.merchant = extractedMerchant;
    }
    if (extractedCategory) {
      updateData.category = extractedCategory;
    }
    if (extractedDate) {
      updateData.date = admin.firestore.Timestamp.fromDate(extractedDate);
    }

    // Adicionar descrição automática
    if (extractedMerchant && extractedAmount !== null) {
      updateData.description = `Compra em ${extractedMerchant} — ${formatCurrency(extractedAmount)}`;
    } else if (extractedMerchant) {
      updateData.description = `Compra em ${extractedMerchant}`;
    }

    // Atualizar documento da transação
    if (Object.keys(updateData).length > 0) {
      const txRef = db
        .collection("couples")
        .doc(coupleId)
        .collection("transactions")
        .doc(transactionId);

      await txRef.update(updateData);

      functions.logger.info(
        `Transação ${transactionId} atualizada com dados do OCR: ${JSON.stringify(updateData)}`
      );
    } else {
      functions.logger.warn(
        `Nenhum dado útil extraído da nota fiscal ${filePath}.`
      );
    }

    // Notificar o usuário que criou a transação
    const txSnap = await db
      .collection("couples")
      .doc(coupleId)
      .collection("transactions")
      .doc(transactionId)
      .get();

    if (txSnap.exists) {
      const txData = txSnap.data();
      const userId = txData.paidBy;

      if (userId) {
        const { tokensByUser } = await getTokensForUsers([userId]);
        const userTokens = tokensByUser[userId] || [];

        const amountStr = extractedAmount !== null
          ? formatCurrency(extractedAmount)
          : "valor não identificado";
        const categoryStr = extractedCategory || "categoria não identificada";

        const notifTitle = "Nota fiscal processada";
        const notifBody = `Nota fiscal processada: ${amountStr} em ${categoryStr}`;

        await sendPushNotification(userTokens, notifTitle, notifBody);

        await createNotificationDoc({
          userId,
          coupleId,
          type: "receipt_processed",
          title: notifTitle,
          message: notifBody,
        });
      }
    }

    return null;
  } catch (error) {
    functions.logger.error(`Erro ao processar nota fiscal (${filePath}):`, error);
    return null;
  }
});

// ---------------------------------------------------------------------------
// 5-7. Funções extras (convites, assinaturas, wrapped)
// ---------------------------------------------------------------------------
const extras = require("./extras");

exports.sendPartnerInvite = extras.sendPartnerInvite;
exports.joinCouple = extras.joinCouple;
exports.subscriptionAlerts = extras.subscriptionAlerts;
exports.yearlyWrapped = extras.yearlyWrapped;

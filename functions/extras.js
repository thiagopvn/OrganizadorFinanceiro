/**
 * extras.js - Cloud Functions adicionais para o Unity Finance
 *
 * Contém:
 * 1. sendPartnerInvite / joinCouple - Convite e entrada de parceiro no casal
 * 2. subscriptionAlerts - Alertas diários de assinaturas próximas do vencimento
 * 3. yearlyWrapped - Resumo financeiro anual do casal (Unity Wrapped)
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const crypto = require("crypto");

const {
  formatCurrency,
  sendPushToCouple,
  sendPushToUser,
  createNotification,
} = require("./helpers");

// Garante que o admin só será inicializado uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// 1. CONVITE DE PARCEIRO
// ============================================================================

/**
 * sendPartnerInvite - Envia convite para um parceiro se juntar ao casal.
 *
 * Recebe: { email, coupleId }
 * - Valida autenticação e pertencimento ao casal
 * - Gera token de convite único
 * - Armazena convite no Firestore com expiração de 7 dias
 * - Retorna link de convite
 */
const sendPartnerInvite = onCall(async (request) => {
  // Verificação de autenticação
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para enviar um convite."
    );
  }

  const { email, coupleId } = request.data;
  const callerId = request.auth.uid;

  // Validação dos parâmetros obrigatórios
  if (!email || !coupleId) {
    throw new HttpsError(
      "invalid-argument",
      "Os campos 'email' e 'coupleId' são obrigatórios."
    );
  }

  // Validação de formato de email básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpsError(
      "invalid-argument",
      "O email informado não é válido."
    );
  }

  try {
    // Verifica se o casal existe e se o chamador é membro
    const coupleDoc = await db.collection("couples").doc(coupleId).get();

    if (!coupleDoc.exists) {
      throw new HttpsError("not-found", "Casal não encontrado.");
    }

    const coupleData = coupleDoc.data();

    if (!coupleData.partnerIds || !coupleData.partnerIds.includes(callerId)) {
      throw new HttpsError(
        "permission-denied",
        "Você não é membro deste casal."
      );
    }

    // Verifica se o casal já está completo
    if (coupleData.partnerIds.length >= 2) {
      throw new HttpsError(
        "failed-precondition",
        "Este casal já possui dois parceiros."
      );
    }

    // Gera token de convite único
    const token = crypto.randomBytes(32).toString("hex");

    // Define expiração para 7 dias a partir de agora
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Armazena o convite no Firestore
    await db.collection("invites").doc(token).set({
      coupleId,
      invitedBy: callerId,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    const inviteLink = `https://organizador-financeiro-a431c.web.app/invite/${token}`;

    // Cria notificação de registro do envio do convite
    await createNotification(
      callerId,
      coupleId,
      "invite_sent",
      "Convite enviado",
      `Convite enviado para ${email}. Válido por 7 dias.`,
      { email, token, inviteLink }
    );

    console.log(
      `[Convite] Usuário ${callerId} enviou convite para ${email} no casal ${coupleId}. Token: ${token}`
    );

    return {
      success: true,
      inviteLink,
    };
  } catch (error) {
    // Re-lança HttpsErrors para que o cliente receba a mensagem correta
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("[Convite] Erro ao enviar convite:", error);
    throw new HttpsError("internal", "Erro interno ao processar o convite.");
  }
});

/**
 * joinCouple - Aceita um convite e adiciona o usuário ao casal.
 *
 * Recebe: { token }
 * - Valida se o convite existe, não expirou e está pendente
 * - Adiciona o usuário autenticado ao casal
 * - Atualiza coupleId do usuário
 * - Marca o convite como aceito
 */
const joinCouple = onCall(async (request) => {
  // Verificação de autenticação
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para aceitar um convite."
    );
  }

  const { token } = request.data;
  const userId = request.auth.uid;

  if (!token) {
    throw new HttpsError(
      "invalid-argument",
      "O campo 'token' é obrigatório."
    );
  }

  try {
    // Busca o convite pelo token
    const inviteDoc = await db.collection("invites").doc(token).get();

    if (!inviteDoc.exists) {
      throw new HttpsError("not-found", "Convite não encontrado.");
    }

    const inviteData = inviteDoc.data();

    // Verifica se o convite já foi utilizado
    if (inviteData.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        `Este convite já foi ${inviteData.status === "accepted" ? "aceito" : "utilizado"}.`
      );
    }

    // Verifica se o convite expirou
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate();

    if (now > expiresAt) {
      // Atualiza o status para expirado
      await db.collection("invites").doc(token).update({ status: "expired" });
      throw new HttpsError("deadline-exceeded", "Este convite já expirou.");
    }

    const { coupleId } = inviteData;

    // Verifica se o casal ainda existe e tem espaço
    const coupleDoc = await db.collection("couples").doc(coupleId).get();

    if (!coupleDoc.exists) {
      throw new HttpsError(
        "not-found",
        "O casal associado a este convite não foi encontrado."
      );
    }

    const coupleData = coupleDoc.data();

    if (coupleData.partnerIds.length >= 2) {
      throw new HttpsError(
        "failed-precondition",
        "Este casal já possui dois parceiros."
      );
    }

    // Verifica se o usuário não está tentando entrar em seu próprio casal
    if (coupleData.partnerIds.includes(userId)) {
      throw new HttpsError(
        "already-exists",
        "Você já é membro deste casal."
      );
    }

    // Usa batch write para garantir atomicidade
    const batch = db.batch();

    // Adiciona o usuário ao casal
    batch.update(db.collection("couples").doc(coupleId), {
      partnerIds: admin.firestore.FieldValue.arrayUnion(userId),
      [`splitRatio.${userId}`]: 50,
    });

    // Atualiza o coupleId do usuário
    batch.update(db.collection("users").doc(userId), {
      coupleId,
    });

    // Marca o convite como aceito
    batch.update(db.collection("invites").doc(token), {
      status: "accepted",
      acceptedBy: userId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Notifica o parceiro que enviou o convite
    const userDoc = await db.collection("users").doc(userId).get();
    const userName = userDoc.exists
      ? userDoc.data().displayName || "Alguém"
      : "Alguém";

    await createNotification(
      inviteData.invitedBy,
      coupleId,
      "invite_accepted",
      "Convite aceito!",
      `${userName} aceitou seu convite e agora faz parte do casal.`,
      { acceptedBy: userId }
    );

    await sendPushToUser(
      inviteData.invitedBy,
      "Convite aceito! 💕",
      `${userName} aceitou seu convite e agora vocês estão conectados.`,
      { type: "invite_accepted", coupleId }
    );

    console.log(
      `[Convite] Usuário ${userId} aceitou convite e entrou no casal ${coupleId}.`
    );

    return {
      success: true,
      coupleId,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("[Convite] Erro ao aceitar convite:", error);
    throw new HttpsError("internal", "Erro interno ao processar o convite.");
  }
});

// ============================================================================
// 2. ALERTAS DE ASSINATURAS (CRON DIÁRIO - 10h BRT)
// ============================================================================

/**
 * subscriptionAlerts - Verifica assinaturas próximas do vencimento e mudanças de preço.
 *
 * Executa diariamente às 10h (horário de Brasília).
 * Para cada casal:
 *   - Verifica assinaturas com vencimento nos próximos 3 dias
 *   - Detecta alterações de preço comparando amount com lastAmount
 *   - Atualiza nextBillingDate de assinaturas vencidas
 *   - Cria notificações para ambos os parceiros
 */
const subscriptionAlerts = onSchedule(
  {
    schedule: "every day 10:00",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    console.log("[Assinaturas] Iniciando verificação diária de assinaturas...");

    try {
      const couplesSnapshot = await db.collection("couples").get();

      if (couplesSnapshot.empty) {
        console.log("[Assinaturas] Nenhum casal encontrado. Finalizando.");
        return;
      }

      let totalAlerts = 0;
      let totalUpdated = 0;

      for (const coupleDoc of couplesSnapshot.docs) {
        const coupleId = coupleDoc.id;
        const coupleData = coupleDoc.data();
        const partnerIds = coupleData.partnerIds || [];

        const subsSnapshot = await db
          .collection("couples")
          .doc(coupleId)
          .collection("subscriptions")
          .where("active", "==", true)
          .get();

        if (subsSnapshot.empty) {
          continue;
        }

        for (const subDoc of subsSnapshot.docs) {
          const sub = subDoc.data();
          const subRef = db
            .collection("couples")
            .doc(coupleId)
            .collection("subscriptions")
            .doc(subDoc.id);

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          // Converte nextBillingDate para objeto Date
          let nextBilling = null;
          if (sub.nextBillingDate) {
            nextBilling = sub.nextBillingDate.toDate
              ? sub.nextBillingDate.toDate()
              : new Date(sub.nextBillingDate);
          }

          if (!nextBilling) {
            console.warn(
              `[Assinaturas] Assinatura ${subDoc.id} do casal ${coupleId} sem data de próxima cobrança.`
            );
            continue;
          }

          // Normaliza para comparar apenas datas (sem hora)
          const nextBillingDate = new Date(
            nextBilling.getFullYear(),
            nextBilling.getMonth(),
            nextBilling.getDate()
          );

          // Calcula diferença em dias
          const diffMs = nextBillingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          // Alerta se a cobrança é nos próximos 3 dias (incluindo hoje)
          if (diffDays >= 0 && diffDays <= 3) {
            const diasTexto =
              diffDays === 0
                ? "hoje"
                : diffDays === 1
                  ? "amanhã"
                  : `em ${diffDays} dias`;

            const mensagem = `Lembrete: ${sub.name} será cobrado ${diasTexto} (${formatCurrency(sub.amount)})`;

            // Notifica ambos os parceiros
            for (const partnerId of partnerIds) {
              await createNotification(
                partnerId,
                coupleId,
                "subscription_alert",
                "Cobrança próxima",
                mensagem,
                {
                  subscriptionId: subDoc.id,
                  subscriptionName: sub.name,
                  amount: sub.amount,
                  daysUntilBilling: diffDays,
                }
              );
            }

            await sendPushToCouple(
              coupleId,
              "Cobrança próxima",
              mensagem,
              { type: "subscription_alert", subscriptionId: subDoc.id }
            );

            totalAlerts++;
            console.log(
              `[Assinaturas] Alerta enviado: ${sub.name} (${coupleId}) - cobrança ${diasTexto}.`
            );
          }

          // Verifica se houve alteração de preço
          if (
            sub.lastAmount !== undefined &&
            sub.lastAmount !== null &&
            sub.amount !== sub.lastAmount &&
            sub.lastAmount > 0
          ) {
            if (sub.amount > sub.lastAmount) {
              const mensagemPreco = `Atenção: ${sub.name} aumentou de ${formatCurrency(sub.lastAmount)} para ${formatCurrency(sub.amount)}`;

              for (const partnerId of partnerIds) {
                await createNotification(
                  partnerId,
                  coupleId,
                  "subscription_alert",
                  "Aumento de assinatura",
                  mensagemPreco,
                  {
                    subscriptionId: subDoc.id,
                    subscriptionName: sub.name,
                    oldAmount: sub.lastAmount,
                    newAmount: sub.amount,
                  }
                );
              }

              await sendPushToCouple(
                coupleId,
                "Aumento de assinatura",
                mensagemPreco,
                { type: "subscription_price_change", subscriptionId: subDoc.id }
              );

              totalAlerts++;
              console.log(
                `[Assinaturas] Alerta de preço: ${sub.name} (${coupleId}) - ${formatCurrency(sub.lastAmount)} → ${formatCurrency(sub.amount)}.`
              );
            }
          }

          // Atualiza nextBillingDate se já passou
          if (nextBillingDate.getTime() < today.getTime()) {
            let newNextBilling = new Date(nextBillingDate);

            if (sub.frequency === "monthly") {
              // Avança meses até encontrar uma data futura
              while (newNextBilling.getTime() < today.getTime()) {
                newNextBilling.setMonth(newNextBilling.getMonth() + 1);
              }
            } else if (sub.frequency === "yearly") {
              // Avança anos até encontrar uma data futura
              while (newNextBilling.getTime() < today.getTime()) {
                newNextBilling.setFullYear(newNextBilling.getFullYear() + 1);
              }
            }

            await subRef.update({
              nextBillingDate: admin.firestore.Timestamp.fromDate(newNextBilling),
            });

            totalUpdated++;
            console.log(
              `[Assinaturas] Data atualizada: ${sub.name} (${coupleId}) → próxima cobrança em ${newNextBilling.toLocaleDateString("pt-BR")}.`
            );
          }
        }
      }

      console.log(
        `[Assinaturas] Verificação concluída. ${totalAlerts} alerta(s) enviado(s), ${totalUpdated} data(s) atualizada(s).`
      );
    } catch (error) {
      console.error(
        "[Assinaturas] Erro durante a verificação de assinaturas:",
        error
      );
      throw error;
    }
  }
);

// ============================================================================
// 3. UNITY WRAPPED ANUAL (CRON - 28 DE DEZEMBRO ÀS 10h BRT)
// ============================================================================

/**
 * yearlyWrapped - Gera o resumo financeiro anual do casal (Unity Wrapped).
 *
 * Executa no dia 28 de dezembro às 10h (horário de Brasília).
 * Para cada casal:
 *   - Coleta todas as transações do ano corrente
 *   - Calcula estatísticas detalhadas (gastos, economias, categorias, etc.)
 *   - Compara com o ano anterior
 *   - Armazena o documento wrapped e notifica os parceiros
 */
const yearlyWrapped = onSchedule(
  {
    schedule: "28 of december 10:00",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const currentYear = new Date().getFullYear();
    console.log(
      `[Wrapped] Iniciando geração do Unity Wrapped ${currentYear}...`
    );

    try {
      const couplesSnapshot = await db.collection("couples").get();

      if (couplesSnapshot.empty) {
        console.log("[Wrapped] Nenhum casal encontrado. Finalizando.");
        return;
      }

      let totalWrappeds = 0;

      for (const coupleDoc of couplesSnapshot.docs) {
        const coupleId = coupleDoc.id;
        const coupleData = coupleDoc.data();
        const partnerIds = coupleData.partnerIds || [];

        try {
          // Define período do ano corrente
          const yearStart = new Date(currentYear, 0, 1); // 1 de janeiro
          const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // 31 de dezembro

          // Busca todas as transações do ano corrente
          const transactionsSnapshot = await db
            .collection("couples")
            .doc(coupleId)
            .collection("transactions")
            .where("date", ">=", admin.firestore.Timestamp.fromDate(yearStart))
            .where("date", "<=", admin.firestore.Timestamp.fromDate(yearEnd))
            .get();

          const transactions = transactionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (transactions.length === 0) {
            console.log(
              `[Wrapped] Casal ${coupleId} não possui transações em ${currentYear}. Pulando.`
            );
            continue;
          }

          // Calcula receitas e despesas
          let totalIncome = 0;
          let totalExpenses = 0;
          const categorySpending = {};
          const monthlyBalance = {}; // { "1": { income: X, expenses: Y }, ... }
          let firstJointPurchase = null;
          let biggestPurchase = null;

          for (const tx of transactions) {
            const amount = tx.amount || 0;
            const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
            const month = txDate.getMonth() + 1; // 1-12

            // Inicializa o balanço mensal se necessário
            if (!monthlyBalance[month]) {
              monthlyBalance[month] = { income: 0, expenses: 0 };
            }

            if (amount >= 0) {
              totalIncome += amount;
              monthlyBalance[month].income += amount;
            } else {
              totalExpenses += Math.abs(amount);
              monthlyBalance[month].expenses += Math.abs(amount);

              // Acumula gastos por categoria
              const category = tx.category || "Sem categoria";
              categorySpending[category] =
                (categorySpending[category] || 0) + Math.abs(amount);

              // Verifica maior compra (maior valor absoluto negativo)
              if (!biggestPurchase || Math.abs(amount) > Math.abs(biggestPurchase.amount)) {
                biggestPurchase = {
                  id: tx.id,
                  description: tx.description || tx.merchant || "Sem descrição",
                  amount: amount,
                  category: tx.category,
                  date: tx.date,
                  merchant: tx.merchant || null,
                };
              }
            }

            // Verifica primeira compra compartilhada do ano
            if (tx.isShared) {
              if (!firstJointPurchase) {
                firstJointPurchase = {
                  id: tx.id,
                  description: tx.description || tx.merchant || "Sem descrição",
                  amount: tx.amount,
                  category: tx.category,
                  date: tx.date,
                  merchant: tx.merchant || null,
                };
              } else {
                const currentFirstDate = firstJointPurchase.date?.toDate
                  ? firstJointPurchase.date.toDate()
                  : new Date(firstJointPurchase.date);
                if (txDate < currentFirstDate) {
                  firstJointPurchase = {
                    id: tx.id,
                    description: tx.description || tx.merchant || "Sem descrição",
                    amount: tx.amount,
                    category: tx.category,
                    date: tx.date,
                    merchant: tx.merchant || null,
                  };
                }
              }
            }
          }

          const totalSaved = totalIncome - totalExpenses;

          // Determina a categoria com maior gasto
          let topCategory = null;
          let topCategoryAmount = 0;
          for (const [category, amount] of Object.entries(categorySpending)) {
            if (amount > topCategoryAmount) {
              topCategory = category;
              topCategoryAmount = amount;
            }
          }

          // Determina o mês com maior economia (income - expenses)
          let monthWithMostSaving = null;
          let maxSaving = -Infinity;
          const monthNames = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
          ];

          for (const [month, balance] of Object.entries(monthlyBalance)) {
            const saving = balance.income - balance.expenses;
            if (saving > maxSaving) {
              maxSaving = saving;
              monthWithMostSaving = monthNames[parseInt(month) - 1];
            }
          }

          // Conta metas atingidas
          const goalsSnapshot = await db
            .collection("couples")
            .doc(coupleId)
            .collection("goals")
            .get();

          let goalsReached = 0;
          goalsSnapshot.docs.forEach((goalDoc) => {
            const goal = goalDoc.data();
            if (
              goal.currentAmount >= goal.targetAmount &&
              goal.targetAmount > 0
            ) {
              goalsReached++;
            }
          });

          // Compara com o ano anterior
          let savingsComparison = null;
          const previousYear = currentYear - 1;
          const previousWrappedDoc = await db
            .collection("couples")
            .doc(coupleId)
            .collection("wrapped")
            .doc(String(previousYear))
            .get();

          if (previousWrappedDoc.exists) {
            const previousData = previousWrappedDoc.data();
            const previousSaved = previousData.totalSaved || 0;

            if (previousSaved !== 0) {
              savingsComparison =
                ((totalSaved - previousSaved) / Math.abs(previousSaved)) * 100;
            } else if (totalSaved > 0) {
              // Ano anterior sem economia, mas este ano tem: melhoria de 100%
              savingsComparison = 100;
            } else {
              savingsComparison = 0;
            }

            // Arredonda para 2 casas decimais
            savingsComparison = Math.round(savingsComparison * 100) / 100;
          }

          // Monta o documento wrapped
          const wrappedData = {
            year: currentYear,
            totalSaved,
            totalExpenses,
            totalIncome,
            topCategory,
            topCategoryAmount,
            monthWithMostSaving,
            goalsReached,
            firstJointPurchase,
            biggestPurchase,
            savingsComparison,
            categoryBreakdown: categorySpending,
            monthlyBalance,
            transactionCount: transactions.length,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Armazena o wrapped
          await db
            .collection("couples")
            .doc(coupleId)
            .collection("wrapped")
            .doc(String(currentYear))
            .set(wrappedData);

          // Notifica ambos os parceiros
          const mensagem = `Seu Unity Wrapped ${currentYear} está pronto! Descubra como vocês se saíram juntos.`;

          for (const partnerId of partnerIds) {
            await createNotification(
              partnerId,
              coupleId,
              "wrapped",
              `Unity Wrapped ${currentYear}`,
              mensagem,
              { year: currentYear }
            );
          }

          await sendPushToCouple(
            coupleId,
            `Unity Wrapped ${currentYear}`,
            mensagem,
            { type: "wrapped", year: String(currentYear) }
          );

          totalWrappeds++;
          console.log(
            `[Wrapped] Gerado para casal ${coupleId}: ` +
              `Receita ${formatCurrency(totalIncome)}, ` +
              `Despesas ${formatCurrency(totalExpenses)}, ` +
              `Economia ${formatCurrency(totalSaved)}, ` +
              `${goalsReached} meta(s) atingida(s).`
          );
        } catch (coupleError) {
          // Erro em um casal não deve impedir o processamento dos demais
          console.error(
            `[Wrapped] Erro ao gerar wrapped para casal ${coupleId}:`,
            coupleError
          );
        }
      }

      console.log(
        `[Wrapped] Geração concluída. ${totalWrappeds} wrapped(s) gerado(s) para ${currentYear}.`
      );
    } catch (error) {
      console.error("[Wrapped] Erro durante a geração do yearly wrapped:", error);
      throw error;
    }
  }
);

module.exports = {
  sendPartnerInvite,
  joinCouple,
  subscriptionAlerts,
  yearlyWrapped,
};

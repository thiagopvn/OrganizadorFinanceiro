/**
 * helpers.js - Funções utilitárias compartilhadas para o Unity Finance
 *
 * Centraliza formatação de moeda, envio de push notifications
 * e criação de documentos de notificação no Firestore.
 */

const admin = require("firebase-admin");

// Garante que o admin só será inicializado uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Formata um valor numérico para o padrão monetário brasileiro.
 * Exemplo: 1234.56 → "R$ 1.234,56"
 *
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em reais
 */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "R$ 0,00";
  }

  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Adiciona sinal negativo se necessário
  const prefix = value < 0 ? "-" : "";
  return `${prefix}R$ ${formatted}`;
}

/**
 * Envia push notification para um usuário específico usando FCM.
 * Busca os tokens FCM do usuário no Firestore e envia para todos os dispositivos.
 *
 * @param {string} userId - ID do usuário destinatário
 * @param {string} title - Título da notificação
 * @param {string} body - Corpo/mensagem da notificação
 * @param {Object} [data={}] - Dados adicionais enviados junto com a notificação
 * @returns {Promise<Object>} Resultado do envio (successCount, failureCount)
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.warn(`[Push] Usuário ${userId} não encontrado no Firestore.`);
      return { successCount: 0, failureCount: 0 };
    }

    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`[Push] Usuário ${userId} não possui tokens FCM registrados.`);
      return { successCount: 0, failureCount: 0 };
    }

    // Converte todos os valores de data para string (exigência do FCM)
    const stringData = {};
    for (const [key, val] of Object.entries(data)) {
      stringData[key] = String(val);
    }

    const message = {
      notification: { title, body },
      data: stringData,
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Remove tokens inválidos para manter a base limpa
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Remove tokens que não são mais válidos
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(fcmTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(
          `[Push] Removendo ${tokensToRemove.length} tokens inválidos do usuário ${userId}.`
        );
        await db
          .collection("users")
          .doc(userId)
          .update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(
              ...tokensToRemove
            ),
          });
      }
    }

    console.log(
      `[Push] Enviado para ${userId}: ${response.successCount} sucesso(s), ${response.failureCount} falha(s).`
    );

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error(`[Push] Erro ao enviar notificação para ${userId}:`, error);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Envia push notification para ambos os parceiros de um casal.
 *
 * @param {string} coupleId - ID do casal
 * @param {string} title - Título da notificação
 * @param {string} body - Corpo/mensagem da notificação
 * @param {Object} [data={}] - Dados adicionais enviados junto com a notificação
 * @returns {Promise<Object>} Resultado agregado do envio
 */
async function sendPushToCouple(coupleId, title, body, data = {}) {
  try {
    const coupleDoc = await db.collection("couples").doc(coupleId).get();

    if (!coupleDoc.exists) {
      console.warn(`[Push] Casal ${coupleId} não encontrado no Firestore.`);
      return { successCount: 0, failureCount: 0 };
    }

    const coupleData = coupleDoc.data();
    const partnerIds = coupleData.partnerIds || [];

    if (partnerIds.length === 0) {
      console.log(`[Push] Casal ${coupleId} não possui parceiros registrados.`);
      return { successCount: 0, failureCount: 0 };
    }

    // Envia para todos os parceiros em paralelo
    const results = await Promise.all(
      partnerIds.map((partnerId) =>
        sendPushToUser(partnerId, title, body, data)
      )
    );

    const totals = results.reduce(
      (acc, r) => ({
        successCount: acc.successCount + r.successCount,
        failureCount: acc.failureCount + r.failureCount,
      }),
      { successCount: 0, failureCount: 0 }
    );

    console.log(
      `[Push] Notificação enviada ao casal ${coupleId}: ${totals.successCount} sucesso(s), ${totals.failureCount} falha(s).`
    );

    return totals;
  } catch (error) {
    console.error(
      `[Push] Erro ao enviar notificação para o casal ${coupleId}:`,
      error
    );
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Cria um documento de notificação no Firestore.
 * Usado para manter histórico de notificações e exibi-las no app.
 *
 * @param {string} userId - ID do usuário destinatário
 * @param {string} coupleId - ID do casal
 * @param {string} type - Tipo da notificação (ex: "subscription_alert", "wrapped", "invite")
 * @param {string} title - Título da notificação
 * @param {string} message - Mensagem da notificação
 * @param {Object} [data={}] - Dados adicionais associados à notificação
 * @returns {Promise<string>} ID do documento criado
 */
async function createNotification(
  userId,
  coupleId,
  type,
  title,
  message,
  data = {}
) {
  try {
    const notificationRef = await db.collection("notifications").add({
      userId,
      coupleId,
      type,
      title,
      message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data,
    });

    console.log(
      `[Notificação] Criada para usuário ${userId} (tipo: ${type}): ${notificationRef.id}`
    );

    return notificationRef.id;
  } catch (error) {
    console.error(
      `[Notificação] Erro ao criar notificação para ${userId}:`,
      error
    );
    throw error;
  }
}

module.exports = {
  formatCurrency,
  sendPushToUser,
  sendPushToCouple,
  createNotification,
};

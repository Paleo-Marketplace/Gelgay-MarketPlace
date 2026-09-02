const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
const TELEGRAM_ADMIN_CHAT_ID = (process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_GROUP_ID || '').trim().replace(/^["']|["']$/g, '');

// In-Memory Message Queue & Dead Letter Queue (DLQ)
const messageQueue = [];
const deadLetterQueue = [];
let isWorkerRunning = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processQueue() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  while (messageQueue.length > 0) {
    const job = messageQueue.shift();
    try {
      await sendDirect(job);
    } catch (err) {
      job.attempts = (job.attempts || 0) + 1;
      const isRateLimit = err.message.includes('429');
      const maxRetries = job.maxRetries || 5;

      if (job.attempts < maxRetries) {
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, job.attempts) + Math.random() * 500);
        console.warn(`[Telegram Queue] Attempt ${job.attempts}/${maxRetries} failed (${err.message}). Retrying in ${Math.round(backoffMs)}ms...`);
        await sleep(backoffMs);
        messageQueue.push(job); // Re-queue with exponential backoff
      } else {
        console.error(`[Telegram DLQ] Message permanently failed after ${maxRetries} retries. Routing to Dead Letter Queue:`, err.message);
        deadLetterQueue.push({
          ...job,
          failedAt: new Date(),
          finalError: err.message
        });
      }
    }
  }

  isWorkerRunning = false;
}

async function sendDirect(job) {
  if (!TELEGRAM_BOT_TOKEN || !job.chatId) {
    return { success: false, skipped: true };
  }

  const endpoint = job.photo
    ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
    : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = job.photo
    ? {
        chat_id: job.chatId,
        photo: job.photo,
        caption: job.text,
        reply_markup: job.replyMarkup
      }
    : {
        chat_id: job.chatId,
        text: job.text,
        reply_markup: job.replyMarkup,
        disable_web_page_preview: true
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: Number(process.env.TELEGRAM_TIMEOUT_MS || 8000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Telegram API returned HTTP ${response.status}: ${errorData.description || 'Unknown error'}`);
  }

  return { success: true };
}

class MessagingService {
  static enqueueMessage(job) {
    messageQueue.push({ ...job, attempts: 0, queuedAt: new Date() });
    processQueue().catch((e) => console.error('[Telegram Queue Worker Error]:', e));
  }

  static async sendTelegramMessage(chatId, text, replyMarkup = null) {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      return { success: false, skipped: true };
    }
    this.enqueueMessage({ chatId, text, replyMarkup });
    return { success: true, queued: true };
  }

  // 1. Admin Telegram Inline Keyboard Approval Loop
  static async sendAdminReceiptApproval({ masterOrder, receiptImageUrl, expectedAmount, buyer }) {
    const adminChatId = TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId || !TELEGRAM_BOT_TOKEN) {
      console.log('[Telegram Admin] Approval notification skipped (TELEGRAM_ADMIN_CHAT_ID not configured)');
      return;
    }

    const caption = `📋 *NEW BANK TRANSFER RECEIPT PENDING APPROVAL*\n\n` +
      `📦 *Master Order:* \`#${masterOrder._id}\`\n` +
      `👤 *Buyer:* ${buyer?.displayName || 'Sofia Bekele'} (${buyer?.email || 'N/A'})\n` +
      `💰 *Expected Amount:* *${expectedAmount} ETB*\n` +
      `🏦 *Method:* ${masterOrder.paymentMethod}\n` +
      `📅 *Date:* ${new Date().toLocaleString()}\n\n` +
      `Please verify the bank receipt screenshot below and tap Approve or Reject:`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve Receipt', callback_data: `approve_receipt:${masterOrder._id}` },
          { text: '❌ Reject Receipt', callback_data: `reject_receipt:${masterOrder._id}` }
        ]
      ]
    };

    if (receiptImageUrl) {
      this.enqueueMessage({
        chatId: adminChatId,
        photo: receiptImageUrl,
        text: caption,
        replyMarkup: inlineKeyboard
      });
    } else {
      this.enqueueMessage({
        chatId: adminChatId,
        text: caption,
        replyMarkup: inlineKeyboard
      });
    }
  }

  static async notifyVendorOrderCreated(vendorUser, vendorOrder) {
    const text = `PALEO order ${vendorOrder._id}: new vendor order worth ${vendorOrder.subtotal} ETB is awaiting payment verification.`;
    return this.sendTelegramMessage(vendorUser && vendorUser.telegramId, text);
  }

  static async notifyOrderDispatched(buyer, vendorOrder) {
    const text = `PALEO order ${vendorOrder.masterOrderId}: vendor package ${vendorOrder._id} is now dispatched.`;
    return this.sendTelegramMessage(buyer && buyer.telegramId, text);
  }

  static async notifyDeliveryAndRelease({ buyer, vendorUser, vendorOrder }) {
    await this.sendTelegramMessage(buyer && buyer.telegramId, `PALEO order ${vendorOrder.masterOrderId}: delivery confirmed.`);
    return this.sendTelegramMessage(
      vendorUser && vendorUser.telegramId,
      `PALEO payout released for vendor order ${vendorOrder._id}: ${vendorOrder.vendorPayout} ETB.`
    );
  }

  static getDLQ() {
    return deadLetterQueue;
  }
}

module.exports = MessagingService;

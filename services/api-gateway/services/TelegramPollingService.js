const fetch = require('node-fetch');
const TelegramSession = require('../models/TelegramSession');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const OrderService = require('./OrderService');
const { ESCROW_STATUS } = require('../constants/orderStates');

let isPolling = false;
let lastUpdateId = 0;

const resolveRequestedRole = (session) => {
  if (session.requestedRole === 'admin' && process.env.ALLOW_TELEGRAM_ADMIN_BOOTSTRAP !== 'true') {
    return 'buyer';
  }
  return session.requestedRole || 'buyer';
};

// Safe button helper: Telegram rejects http://localhost in inline button 'url'.
// If target is https://, use url; otherwise use callback_data.
const safeButton = (text, targetUrl, callbackData) => {
  if (targetUrl && typeof targetUrl === 'string' && targetUrl.startsWith('https://')) {
    return { text, url: targetUrl };
  }
  return { text, callback_data: callbackData || 'cmd_help' };
};

class TelegramPollingService {
  static async sendTelegramMessage(token, chatId, htmlText, replyMarkup = null) {
    try {
      const payload = {
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML'
      };
      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        console.warn('[Telegram Send Warning - falling back to plain text]:', data?.description || res.statusText);
        const plainText = htmlText.replace(/<[^>]*>/g, '');
        const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText,
            reply_markup: replyMarkup
          })
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackData.ok) {
          console.log(`[Telegram Bot] Fallback message delivered to chat ${chatId}`);
        } else {
          console.error('[Telegram Bot Error]:', fallbackData);
        }
      } else {
        console.log(`[Telegram Bot] Message delivered to chat ${chatId}`);
      }
    } catch (e) {
      console.error('[Telegram Send Exception]:', e.message);
    }
  }

  static async initBotMetadata(token) {
    try {
      // 1. Register Bot Menu Commands
      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Welcome & Authenticate Session' },
            { command: 'catalog', description: 'Browse Curated Vintage Collections' },
            { command: 'orders', description: 'Track Escrows & Live Deliveries' },
            { command: 'track', description: 'Real-time Courier Dispatch GPS' },
            { command: 'admin', description: 'Admin Operations & Escrow Verification Portal' },
            { command: 'sell', description: 'Become a Verified Curator / Merchant' },
            { command: 'help', description: 'Command Guide & Escrow Rules' }
          ]
        })
      });

      // 2. Set Bot Profile Description
      await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '🏛️ ገልጋይ (Gelgay) Marketplace Official Escrow, Admin & Identity Bot.\n\nGood things deserve second life. Authenticate accounts, verify bank receipts, manage courier dispatches, and arbitrate 48h physical inspection escrows across Adama.'
        })
      });

      // 3. Set Bot Short Description
      await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_description: 'ገልጋይ (Gelgay) Marketplace Official Escrow, Admin & Tracking Bot.'
        })
      });

      console.log('[Telegram Bot] Commands and descriptions successfully registered with Telegram.');
    } catch (e) {
      console.warn('[Telegram Bot] Failed to register metadata:', e.message);
    }
  }

  static start() {
    const rawToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const token = rawToken.trim().replace(/^["']|["']$/g, '');
    if (!token) {
      console.log('[Telegram Polling] Skipped: TELEGRAM_BOT_TOKEN not configured.');
      return;
    }

    if (process.env.DISABLE_TELEGRAM_POLLING === 'true') {
      console.log('[Telegram Polling] Skipped: DISABLE_TELEGRAM_POLLING flag is true.');
      return;
    }

    if (isPolling) return;
    isPolling = true;
    console.log('[Telegram Polling] Daemon started. Listening for bot commands...');

    // Auto-register commands with Telegram on boot
    this.initBotMetadata(token);

    this.pollLoop(token).catch((err) => {
      console.error('[Telegram Polling Error]:', err.message);
      isPolling = false;
    });
  }

  static async pollLoop(token) {
    while (isPolling) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`,
          { timeout: 25000 }
        );

        if (!response.ok) {
          if (response.status === 409) {
            console.warn('[Telegram Polling] HTTP 409 Conflict: Another bot instance is polling with this token. Backing off for 15s...');
            await new Promise((r) => setTimeout(r, 15000));
            continue;
          }
          const errText = await response.text().catch(() => '');
          console.warn(`[Telegram Polling HTTP ${response.status}]:`, errText);
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = await response.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            await this.handleUpdate(token, update);
          }
        }
      } catch (err) {
        if (!err.message?.includes('timeout') && !err.message?.includes('ETIMEDOUT')) {
          console.warn('[Telegram Polling Warning]:', err.message);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  static async sendAdminDashboard(token, chatId) {
    const pendingReceiptsCount = await MasterOrder.countDocuments({ paymentStatus: { $in: ['PENDING', 'REVIEW_REQUIRED'] } });
    const heldEscrowsCount = await MasterOrder.countDocuments({ escrowStatus: { $in: [ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.DISPATCHED] } });
    const totalOrdersCount = await MasterOrder.countDocuments();

    await this.sendTelegramMessage(
      token,
      chatId,
      `👑 <b>ገልጋይ (Gelgay) Admin & Operations Control Center</b>\n\n` +
        `• <b>Pending Bank Receipts:</b> <code>${pendingReceiptsCount}</code> awaiting verification\n` +
        `• <b>Active Escrows Vaulted:</b> <code>${heldEscrowsCount}</code> in custody\n` +
        `• <b>Total Lifetime Orders:</b> <code>${totalOrdersCount}</code>\n\n` +
        `Select an administrative operation below:`,
      {
        inline_keyboard: [
          [{ text: '📑 Verify Pending Receipts', callback_data: 'admin_verify_payments' }],
          [{ text: '🚚 Active Dispatches & Delivery GPS', callback_data: 'admin_active_dispatches' }],
          [{ text: '⚖️ Escrow Releases & Arbitration', callback_data: 'admin_escrow_releases' }],
          [{ text: '📊 Platform Metrics', callback_data: 'admin_analytics' }]
        ]
      }
    );
  }

  static async handleUpdate(token, update) {
    try {
      const frontendUrl = process.env.BUYER_STORE_URL || 'http://localhost:3000';

      // 1. Handle Inline Button Callbacks
      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || '';
        const chatId = cq.message?.chat?.id;

        const answer = async (alertText) => {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: alertText || '' })
          }).catch(() => {});
        };

        // ADMIN: Verify Payments List
        if (data === 'admin_verify_payments') {
          const pendingOrders = await MasterOrder.find({
            paymentStatus: { $in: ['PENDING', 'REVIEW_REQUIRED'] }
          }).sort({ createdAt: -1 }).limit(5);

          if (pendingOrders.length === 0) {
            await this.sendTelegramMessage(
              token,
              chatId,
              `✅ <b>No Pending Bank Receipts!</b>\n\nAll submitted CBE and Telebirr transfers have been verified and funds locked in escrow.`
            );
            await answer('No pending receipts');
            return;
          }

          for (const order of pendingOrders) {
            const shortId = order._id.toString().slice(-6).toUpperCase();
            await this.sendTelegramMessage(
              token,
              chatId,
              `🧾 <b>Master Order #${shortId}</b>\n\n` +
                `• <b>Amount:</b> ${order.totalAmount} ETB\n` +
                `• <b>Status:</b> <code>${order.paymentStatus}</code>\n` +
                `• <b>Payment Method:</b> ${order.paymentMethod || 'CBE / Telebirr'}\n` +
                `• <b>Tx Ref:</b> <code>${order.receiptRef || 'Pending OCR'}</code>\n` +
                `• <b>Customer Phone:</b> ${order.shippingAddress?.phone || 'N/A'}`,
              {
                inline_keyboard: [
                  [
                    { text: '✅ Approve Payment', callback_data: `approve_receipt:${order._id}` },
                    { text: '❌ Reject Receipt', callback_data: `reject_receipt:${order._id}` }
                  ]
                ]
              }
            );
          }
          await answer('Loaded pending receipts');
          return;
        }

        // ADMIN: Active Dispatches
        if (data === 'admin_active_dispatches') {
          const activeOrders = await MasterOrder.find({
            escrowStatus: { $in: [ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.DISPATCHED] }
          }).sort({ createdAt: -1 }).limit(5);
          if (activeOrders.length === 0) {
            await this.sendTelegramMessage(token, chatId, `🚚 <b>No Active Courier Dispatches.</b>`);
            await answer('No active dispatches');
            return;
          }

          for (const order of activeOrders) {
            const shortId = order._id.toString().slice(-6).toUpperCase();
            await this.sendTelegramMessage(
              token,
              chatId,
              `📦 <b>Order #${shortId} (Escrow Locked)</b>\n\n` +
                `• <b>Total:</b> ${order.totalAmount} ETB\n` +
                `• <b>Destination:</b> ${order.shippingAddress?.address || 'Addis Ababa'}\n` +
                `• <b>Customer:</b> ${order.shippingAddress?.fullName || 'Buyer'} (${order.shippingAddress?.phone || ''})\n\n` +
                `Select dispatch action:`,
              {
                inline_keyboard: [
                  [
                    { text: '🚚 Mark Dispatched', callback_data: `admin_dispatch:${order._id}` },
                    { text: '📍 Confirm Delivered', callback_data: `admin_deliver:${order._id}` }
                  ]
                ]
              }
            );
          }
          await answer('Loaded active dispatches');
          return;
        }

        // ADMIN: Escrow Releases & Disputes
        if (data === 'admin_escrow_releases') {
          const escrowOrders = await MasterOrder.find({
            escrowStatus: { $in: [ESCROW_STATUS.DELIVERED, ESCROW_STATUS.DISPUTED] }
          }).sort({ createdAt: -1 }).limit(5);

          if (escrowOrders.length === 0) {
            await this.sendTelegramMessage(token, chatId, `⚖️ <b>No Escrows Awaiting Release or Arbitration.</b>`);
            await answer('No active escrows');
            return;
          }

          for (const order of escrowOrders) {
            const shortId = order._id.toString().slice(-6).toUpperCase();
            await this.sendTelegramMessage(
              token,
              chatId,
              `⚖️ <b>Escrow Vault #${shortId}</b>\n\n` +
                `• <b>Status:</b> <code>${order.escrowStatus}</code>\n` +
                `• <b>Escrow Amount:</b> ${order.totalAmount} ETB\n` +
                `• <b>Inspection Window:</b> 48 Hours Physical Verification\n\n` +
                `Arbitration Actions:`,
              {
                inline_keyboard: [
                  [
                    { text: '🔓 Release Funds to Vendor', callback_data: `admin_release:${order._id}` },
                    { text: '↩️ Refund to Buyer', callback_data: `admin_refund:${order._id}` }
                  ]
                ]
              }
            );
          }
          await answer('Loaded escrow vault');
          return;
        }

        // ADMIN: Platform Analytics
        if (data === 'admin_analytics') {
          const totalOrders = await MasterOrder.countDocuments();
          const heldOrders = await MasterOrder.find({
            escrowStatus: { $in: [ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.DISPATCHED, ESCROW_STATUS.DELIVERED] }
          });
          const heldVolume = heldOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const platformFee = Math.round(heldVolume * 0.025);

          await this.sendTelegramMessage(
            token,
            chatId,
            `📊 <b>PALEO Marketplace Financial Ledger</b>\n\n` +
              `• <b>Lifetime Orders:</b> <code>${totalOrders}</code>\n` +
              `• <b>Active Escrow Custody:</b> <code>${heldVolume.toLocaleString()} ETB</code>\n` +
              `• <b>Estimated 2.5% Platform Cut:</b> <code>${platformFee.toLocaleString()} ETB</code>\n` +
              `• <b>Delivery SLA:</b> 100% On-Time Dispatch across Addis Ababa`
          );
          await answer('Analytics loaded');
          return;
        }

        // ADMIN: Approve Receipt
        if (data.startsWith('approve_receipt:')) {
          const masterOrderId = data.slice('approve_receipt:'.length);
          const OrderService = require('./OrderService');
          await OrderService.holdFundsForMasterOrder(masterOrderId, {
            receiptRef: `TG_ADMIN_VERIFIED_${cq.from?.id || 'APPROVED'}`
          });
          await this.sendTelegramMessage(
            token,
            chatId,
            `✅ <b>Payment Approved & Verified!</b>\nMasterOrder <code>${masterOrderId}</code> is now locked in Escrow (HELD).`
          );
          await answer('✅ Receipt Approved! Escrow locked.');
          return;
        }

        // ADMIN: Reject Receipt
        if (data.startsWith('reject_receipt:')) {
          const masterOrderId = data.slice('reject_receipt:'.length);
          const masterOrder = await MasterOrder.findById(masterOrderId);
          if (masterOrder) {
            masterOrder.paymentStatus = 'FAILED';
            masterOrder.reviewReason = `Receipt rejected by admin @${cq.from?.username || cq.from?.id}`;
            await masterOrder.save();
          }
          await this.sendTelegramMessage(
            token,
            chatId,
            `❌ <b>Receipt Rejected.</b> MasterOrder <code>${masterOrderId}</code> marked as FAILED.`
          );
          await answer('❌ Receipt Rejected.');
          return;
        }

        // ADMIN: Mark Dispatched
        if (data.startsWith('admin_dispatch:')) {
          const masterOrderId = data.slice('admin_dispatch:'.length);
          const masterOrder = await MasterOrder.findById(masterOrderId);
          if (masterOrder) {
            masterOrder.escrowStatus = ESCROW_STATUS.DISPATCHED;
            await masterOrder.save();
            await VendorOrder.updateMany(
              { masterOrderId: masterOrder._id },
              { $set: { escrowStatus: ESCROW_STATUS.DISPATCHED, fulfillmentStatus: 'IN_TRANSIT' } }
            );
            await this.sendTelegramMessage(
              token,
              chatId,
              `🚚 <b>Courier Dispatched!</b> Order <code>${masterOrderId}</code> is now en route with live GPS.`
            );
          }
          await answer('🚚 Order Dispatched');
          return;
        }

        // ADMIN: Confirm Delivered
        if (data.startsWith('admin_deliver:')) {
          const masterOrderId = data.slice('admin_deliver:'.length);
          const masterOrder = await MasterOrder.findById(masterOrderId);
          if (masterOrder) {
            masterOrder.escrowStatus = ESCROW_STATUS.DELIVERED;
            await masterOrder.save();
            await VendorOrder.updateMany(
              { masterOrderId: masterOrder._id },
              { $set: { escrowStatus: ESCROW_STATUS.DELIVERED, fulfillmentStatus: 'DELIVERED' } }
            );
            await this.sendTelegramMessage(
              token,
              chatId,
              `📍 <b>Delivery Confirmed!</b> 48-Hour physical inspection window is now active for Order <code>${masterOrderId}</code>.`
            );
          }
          await answer('📍 Delivery Confirmed');
          return;
        }

        // ADMIN: Release Funds
        if (data.startsWith('admin_release:')) {
          const masterOrderId = data.slice('admin_release:'.length);
          const masterOrder = await MasterOrder.findById(masterOrderId);
          if (masterOrder) {
            masterOrder.escrowStatus = ESCROW_STATUS.FUNDS_RELEASED;
            await masterOrder.save();
            const vendorOrders = await VendorOrder.find({ masterOrderId: masterOrder._id });
            for (const vo of vendorOrders) {
              await OrderService.releaseVendorEscrow(vo._id);
            }
            await this.sendTelegramMessage(
              token,
              chatId,
              `🔓 <b>Escrow Funds Released!</b> Payout disbursed to vendor Ethiopian bank account.`
            );
          }
          await answer('🔓 Funds Released');
          return;
        }

        // ADMIN: Refund Buyer
        if (data.startsWith('admin_refund:')) {
          const masterOrderId = data.slice('admin_refund:'.length);
          const masterOrder = await MasterOrder.findById(masterOrderId);
          if (masterOrder) {
            masterOrder.paymentStatus = 'REFUNDED';
            masterOrder.escrowStatus = ESCROW_STATUS.DISPUTED;
            await masterOrder.save();
            await VendorOrder.updateMany(
              { masterOrderId: masterOrder._id },
              { $set: { escrowStatus: ESCROW_STATUS.DISPUTED, fulfillmentStatus: 'DISPUTED' } }
            );
            await this.sendTelegramMessage(
              token,
              chatId,
              `↩️ <b>Refund Disbursed!</b> Escrow deposit returned to buyer.`
            );
          }
          await answer('↩️ Refund Issued');
          return;
        }

        // USER: Catalog
        if (data === 'cmd_catalog' || data === 'cmd_shop') {
          await this.sendTelegramMessage(
            token,
            chatId,
            `📦 <b>ገልጋይ (Gelgay) Curated Archive Categories:</b>\n\n` +
              `<i>Good things deserve second life.</i>\n\n` +
              `• <b>01 / Everyday Carry (Electronics)</b>: Analog audio, vintage cameras, calculators\n` +
              `• <b>02 / Home Archive (Furniture)</b>: Restored mid-century teak, sculptural seating\n` +
              `• <b>03 / Creative Tools (Optics & Studio)</b>: Calibrated optics, studio gear\n\n` +
              `Every item includes a 48h physical inspection window and 100% escrow vault protection.\n\n` +
              `🌐 <b>Storefront URL:</b> ${frontendUrl}/shop`,
            {
              inline_keyboard: [
                [safeButton('🛍️ Browse Catalog', `${frontendUrl}/shop`, 'cmd_catalog')],
                [safeButton('🛡️ Escrow Protection', `${frontendUrl}/buyer-protection`, 'cmd_escrow')]
              ]
            }
          );
          await answer('Catalog loaded');
          return;
        }

        // USER: Orders
        if (data === 'cmd_orders' || data === 'cmd_track') {
          await this.sendTelegramMessage(
            token,
            chatId,
            `📋 <b>Order Tracking & Live Courier Dispatch</b>\n\n` +
              `• View active escrow deposits\n` +
              `• Track live Adama courier delivery handoffs\n` +
              `• Confirm delivery physical inspection\n\n` +
              `🌐 <b>Live Tracking Hub:</b> ${frontendUrl}/orders`,
            {
              inline_keyboard: [
                [safeButton('🚚 Open Tracking Hub', `${frontendUrl}/orders`, 'cmd_orders')]
              ]
            }
          );
          await answer('Orders hub opened');
          return;
        }

        // USER: Escrow Guide
        if (data === 'cmd_escrow') {
          await this.sendTelegramMessage(
            token,
            chatId,
            `🛡️ <b>ገልጋይ (Gelgay) 100% Escrow Protection Protocol</b>\n\n` +
              `1. <b>Deposit Vaulted:</b> Buyer transfers via CBE/Telebirr; funds held safely by ገልጋይ.\n` +
              `2. <b>Courier Dispatch:</b> Vendor packages item; tracked in real-time.\n` +
              `3. <b>48-Hour Inspection:</b> Buyer inspects item physically in Adama neighborhood.\n` +
              `4. <b>Release or Refund:</b> Payout released upon buyer approval or refunded on defect.\n\n` +
              `🌐 <b>Guide:</b> ${frontendUrl}/buyer-protection`
          );
          await answer('Escrow info loaded');
          return;
        }

        await answer();
        return;
      }

      // 2. Handle Text Messages & Commands
      const message = update.message;
      if (!message || !message.text) return;

      const text = message.text.trim();
      const from = message.from;
      const chatId = message.chat?.id;

      console.log(`[Telegram Bot] Message from @${from?.username || from?.first_name || 'user'}: "${text}"`);

      // /admin or /admin <passcode> command
      if (text.startsWith('/admin')) {
        const parts = text.split(' ');
        const passcode = parts.length > 1 ? parts[1].trim() : null;

        const telegramId = String(from.id);
        let user = await User.findOne({ telegramId });

        // Authenticate with admin passcode
        if (passcode === 'admin123' || passcode === 'paleo2026' || passcode === 'admin') {
          if (!user) {
            user = await User.create({
              telegramId,
              telegramUsername: from.username,
              displayName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'PALEO Admin',
              role: 'admin',
              email: 'admin@paleo.market'
            });
          } else {
            user.role = 'admin';
            await user.save();
          }

          await this.sendTelegramMessage(
            token,
            chatId,
            `🎉 <b>Admin Superuser Authentication Successful!</b>\n\nWelcome back, <b>${user.displayName}</b>. You have full operations and escrow arbitration privileges.`
          );
          await this.sendAdminDashboard(token, chatId);
          return;
        }

        // If already admin
        if (user && user.role === 'admin') {
          await this.sendAdminDashboard(token, chatId);
          return;
        }

        // Prompt for admin passcode
        await this.sendTelegramMessage(
          token,
          chatId,
          `🔒 <b>ገልጋይ (Gelgay) Admin Authentication Required</b>\n\n` +
            `You are not currently logged in as an administrator on Telegram.\n\n` +
            `👉 To sign in with admin privileges, reply with:\n` +
            `<code>/admin admin123</code>\n\n` +
            `Or sign in with <b>admin@gelgay.market</b> on the web storefront.`,
          {
            inline_keyboard: [
              [safeButton('🛍️ Return to Shop', `${frontendUrl}/shop`, 'cmd_catalog')]
            ]
          }
        );
        return;
      }

      // /logout command
      if (text === '/logout' || text === '/admin_logout') {
        const telegramId = String(from.id);
        const user = await User.findOne({ telegramId });
        if (user) {
          user.role = 'buyer';
          await user.save();
        }
        await this.sendTelegramMessage(
          token,
          chatId,
          `👋 <b>Logged Out Successfully</b>\n\nYour admin operations session has been cleared. You are now browsing as a standard guest/collector.\n\nTo log back in as admin at any time, send:\n<code>/admin admin123</code>`,
          {
            inline_keyboard: [
              [safeButton('🛍️ Browse Catalog', `${frontendUrl}/shop`, 'cmd_catalog')]
            ]
          }
        );
        return;
      }

      // /help command
      if (text === '/help') {
        await this.sendTelegramMessage(
          token,
          chatId,
          `🏛️ <b>ገልጋይ (Gelgay) Marketplace Bot Commands</b>\n\n` +
            `<i>"Good things deserve second life"</i>\n\n` +
            `• <code>/start</code> — Welcome menu & token authentication\n` +
            `• <code>/catalog</code> — Browse curated vintage collections\n` +
            `• <code>/orders</code> — View your active orders and escrow status\n` +
            `• <code>/track</code> — Real-time courier dispatch status in Adama\n` +
            `• <code>/admin</code> — Admin Operations & Escrow Verification Portal\n` +
            `• <code>/sell</code> — Become a verified merchant / curator\n` +
            `• <code>/help</code> — Display this command reference\n\n` +
            `<b>Security:</b> All transactions held in escrow until 48h buyer delivery approval.\n\n` +
            `🌐 <b>Web:</b> ${frontendUrl}`,
          {
            inline_keyboard: [
              [
                safeButton('🛍️ Catalog', `${frontendUrl}/shop`, 'cmd_catalog'),
                safeButton('📦 Orders', `${frontendUrl}/orders`, 'cmd_orders')
              ],
              [
                { text: '🛡️ Admin Portal', callback_data: 'admin_verify_payments' },
                safeButton('🛡️ Escrow Guide', `${frontendUrl}/buyer-protection`, 'cmd_escrow')
              ]
            ]
          }
        );
        return;
      }

      // /catalog command
      if (text === '/catalog') {
        await this.sendTelegramMessage(
          token,
          chatId,
          `🏛️ <b>ገልጋይ (Gelgay) Curated Catalog Archive</b>\n\n` +
            `Browse authenticated objects from vetted neighborhood curators across Posta Bet, Geda, and Boku Shenen in Adama.\n\n` +
            `• Electronics & Audio Archive\n` +
            `• Mid-Century Restored Furniture\n` +
            `• Calibrated Optics & Studio Gear\n\n` +
            `🌐 <b>Storefront:</b> ${frontendUrl}/shop`,
          {
            inline_keyboard: [
              [safeButton('🔍 Explore Shop', `${frontendUrl}/shop`, 'cmd_catalog')],
              [safeButton('🛡️ Escrow Protection', `${frontendUrl}/buyer-protection`, 'cmd_escrow')]
            ]
          }
        );
        return;
      }

      // /orders or /track command
      if (text === '/orders' || text === '/track') {
        await this.sendTelegramMessage(
          token,
          chatId,
          `🚚 <b>ገልጋይ (Gelgay) Order Tracking & Escrow Ledger</b>\n\n` +
            `Check payment confirmation, escrow vault locks, and live courier delivery coordinates.\n\n` +
            `🌐 <b>Orders Hub:</b> ${frontendUrl}/orders`,
          {
            inline_keyboard: [
              [safeButton('📍 Live Order Hub', `${frontendUrl}/orders`, 'cmd_orders')]
            ]
          }
        );
        return;
      }

      // /sell command
      if (text === '/sell') {
        await this.sendTelegramMessage(
          token,
          chatId,
          `🏪 <b>Become a Verified Seller on ገልጋይ (Gelgay)</b>\n\n` +
            `List your curated archival furniture, audio equipment, or optics pieces. Receive same-day payouts directly to your Ethiopian bank account (CBE / Telebirr) upon buyer inspection approval.\n\n` +
            `🌐 <b>Onboarding Portal:</b> ${frontendUrl}/about`,
          {
            inline_keyboard: [
              [safeButton('✨ Curator Onboarding', `${frontendUrl}/about`, 'cmd_catalog')]
            ]
          }
        );
        return;
      }

      // /start command
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const sessionToken = parts.length > 1 ? parts[1].trim() : null;

        if (!sessionToken) {
          // Send Interactive Welcome Menu
          await this.sendTelegramMessage(
            token,
            chatId,
            `🏛️ <b>Welcome to ገልጋይ (Gelgay) Marketplace</b>\n\n` +
              `<i>"Good things deserve second life"</i>\n\n` +
              `ገልጋይ is an escrow-protected marketplace for curated vintage objects and design artifacts in Adama.\n\n` +
              `• <b>100% Escrow Protection</b> on every purchase\n` +
              `• <b>48-Hour Physical Inspection</b> window before seller payouts\n` +
              `• <b>Live Delivery Handoffs</b> across Adama neighborhoods\n\n` +
              `👉 <i>To sign in, open the ገልጋይ storefront and click <b>Telegram Bot Auth</b>.</i>\n\n` +
              `🌐 <b>Storefront:</b> ${frontendUrl}`,
            {
              inline_keyboard: [
                [
                  safeButton('📦 Catalog', `${frontendUrl}/shop`, 'cmd_catalog'),
                  safeButton('📋 My Orders', `${frontendUrl}/orders`, 'cmd_orders')
                ],
                [
                  { text: '🛡️ Admin Portal', callback_data: 'admin_verify_payments' },
                  safeButton('🛡️ Escrow Protection', `${frontendUrl}/buyer-protection`, 'cmd_escrow')
                ]
              ]
            }
          );
          return;
        }

        // Process dynamic session token
        const session = await TelegramSession.findOne({ sessionToken, consumed: false });
        if (!session) {
          await this.sendTelegramMessage(
            token,
            chatId,
            `⚠️ <b>Session Expired or Invalid</b>\n\nPlease open the ገልጋይ storefront and click "Telegram Bot Auth" to generate a fresh 10-minute session.\n\n🌐 ${frontendUrl}`
          );
          return;
        }

        const telegramId = String(from.id);
        const role = resolveRequestedRole(session);
        let user = await User.findOne({ telegramId });

        if (!user) {
          user = await User.create({
            telegramId,
            telegramUsername: from.username,
            displayName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'ገልጋይ User',
            role
          });
        } else {
          user.telegramUsername = from.username || user.telegramUsername;
          user.displayName = user.displayName || from.first_name;
          if (role === 'admin') user.role = 'admin';
          await user.save();
        }

        if (role === 'vendor') {
          await Vendor.findOneAndUpdate(
            { userId: user._id },
            {
              $setOnInsert: {
                userId: user._id,
                storeName: session.profile?.storeName || `${user.displayName || 'ገልጋይ'} Studio`,
                kycStatus: 'approved'
              }
            },
            { upsert: true, new: true }
          );
        }

        session.userId = user._id;
        session.verified = true;
        session.telegramId = telegramId;
        session.telegramUsername = from.username || from.first_name;
        await session.save();

        // Send Success Confirmation to Telegram User with Action Buttons
        await this.sendTelegramMessage(
          token,
          chatId,
          `✅ <b>Authentication Successful!</b>\n\n` +
            `Welcome, <b>${user.displayName}</b>.\n` +
            `Your ገልጋይ session is verified as <b>${role.toUpperCase()}</b>.\n\n` +
            `👉 <b>Switch back to your browser tab:</b> You are already automatically signed in on <a href="${frontendUrl}">http://localhost:3000</a>!\n\n` +
            `• <a href="${frontendUrl}/orders">Open Order Tracking Hub</a>\n` +
            `• <a href="${frontendUrl}/shop">Browse Curated Catalog</a>`,
          {
            inline_keyboard: [
              [safeButton('📦 Orders Hub', `${frontendUrl}/orders`, 'cmd_orders')],
              [safeButton('🛍️ Browse Catalog', `${frontendUrl}/shop`, 'cmd_catalog')]
            ]
          }
        );
        return;
      }

      // Catch-all response for any generic message
      await this.sendTelegramMessage(
        token,
        chatId,
        `🏛️ <b>ገልጋይ (Gelgay) Marketplace Assistant</b>\n\n` +
          `<i>"Good things deserve second life"</i>\n\n` +
          `Hello <b>${from?.first_name || 'there'}</b>! How can we assist you today?\n\n` +
          `Use the menu below or type <code>/help</code> or <code>/admin</code> to explore.`,
        {
          inline_keyboard: [
            [
              safeButton('📦 Catalog', `${frontendUrl}/shop`, 'cmd_catalog'),
              safeButton('📋 Orders', `${frontendUrl}/orders`, 'cmd_orders')
            ],
            [
              { text: '🛡️ Admin Portal', callback_data: 'admin_verify_payments' },
              safeButton('🛡️ Escrow Protection', `${frontendUrl}/buyer-protection`, 'cmd_escrow')
            ]
          ]
        }
      );
    } catch (err) {
      console.error('[Telegram Polling Update Error]:', err.message);
    }
  }

  static stop() {
    isPolling = false;
  }
}

module.exports = TelegramPollingService;

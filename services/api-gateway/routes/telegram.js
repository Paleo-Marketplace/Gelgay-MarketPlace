const express = require('express');
const fetch = require('node-fetch');
const TelegramSession = require('../models/TelegramSession');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MasterOrder = require('../models/MasterOrder');
const OrderService = require('../services/OrderService');

const router = express.Router();

const resolveRequestedRole = (session) => {
  if (session.requestedRole === 'admin' && process.env.ALLOW_TELEGRAM_ADMIN_BOOTSTRAP !== 'true') {
    return 'buyer';
  }
  return session.requestedRole || 'buyer';
};

router.post('/webhooks/telegram', async (req, res) => {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && req.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
      return res.status(401).json({ ok: false, message: 'Invalid Telegram webhook secret' });
    }

    // Handle Admin Inline Keyboard Approval/Rejection Callbacks
    if (req.body && req.body.callback_query) {
      const cq = req.body.callback_query;
      const data = cq.data || '';

      if (data.startsWith('approve_receipt:')) {
        const masterOrderId = data.slice('approve_receipt:'.length);
        await OrderService.holdFundsForMasterOrder(masterOrderId, {
          receiptRef: `TG_ADMIN_${cq.from?.id || 'APPROVED'}`
        });

        if (process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: '✅ Receipt Approved & Funds Held in Escrow!'
            })
          }).catch(() => {});
        }
        return res.json({ ok: true });
      }

      if (data.startsWith('reject_receipt:')) {
        const masterOrderId = data.slice('reject_receipt:'.length);
        const masterOrder = await MasterOrder.findById(masterOrderId);
        if (masterOrder) {
          masterOrder.paymentStatus = 'FAILED';
          masterOrder.reviewReason = `Receipt rejected by admin ${cq.from?.username || cq.from?.id}`;
          await masterOrder.save();
        }

        if (process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: '❌ Receipt Rejected.'
            })
          }).catch(() => {});
        }
        return res.json({ ok: true });
      }

      return res.json({ ok: true });
    }

    const message = req.body && req.body.message;
    const text = message && typeof message.text === 'string' ? message.text.trim() : '';
    const from = message && message.from;

    if (!text.startsWith('/start ') || !from || !from.id) {
      return res.json({ ok: true });
    }

    const sessionToken = text.slice('/start '.length).trim();
    const session = await TelegramSession.findOne({ sessionToken, consumed: false });
    if (!session) {
      return res.json({ ok: true });
    }

    const telegramId = String(from.id);
    const role = resolveRequestedRole(session);
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        telegramUsername: from.username,
        displayName: session.profile.displayName || [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username,
        email: session.profile.email,
        role
      });
    } else {
      user.telegramUsername = from.username || user.telegramUsername;
      user.displayName = user.displayName || session.profile.displayName || from.first_name;
      if (role !== 'admin' || process.env.ALLOW_TELEGRAM_ADMIN_BOOTSTRAP === 'true') {
        user.role = role;
      }
      await user.save();
    }

    if (role === 'vendor') {
      await Vendor.findOneAndUpdate(
        { userId: user._id },
        {
          $setOnInsert: {
            userId: user._id,
            storeName: session.profile.storeName || `${user.displayName || 'PALEO'} Store`,
            payoutDetails: {
              bank: session.profile.bank,
              account: session.profile.account
            },
            kycStatus: 'pending'
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

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] error:', error.message);
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;

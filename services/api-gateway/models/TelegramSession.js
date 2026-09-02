const mongoose = require('mongoose');

const TelegramSessionSchema = new mongoose.Schema(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedRole: {
      type: String,
      enum: ['buyer', 'vendor', 'admin'],
      default: 'buyer'
    },
    profile: {
      email: String,
      displayName: String,
      storeName: String,
      bank: String,
      account: String
    },
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true
    },
    telegramId: {
      type: String
    },
    telegramUsername: {
      type: String
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
      expires: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TelegramSession', TelegramSessionSchema);

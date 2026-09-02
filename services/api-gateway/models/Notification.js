const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    role: {
      type: String,
      enum: ['buyer', 'vendor', 'admin', 'courier', 'all'],
      default: 'all',
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['escrow', 'order', 'courier', 'payout', 'review', 'kyc', 'system'],
      default: 'system'
    },
    link: {
      type: String,
      trim: true
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);

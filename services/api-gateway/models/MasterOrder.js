const mongoose = require('mongoose');

const ESCROW_STATUSES = [
  'PENDING_PAYMENT',
  'FUNDS_HELD_IN_ESCROW',
  'DISPATCHED',
  'DELIVERED',
  'FUNDS_RELEASED',
  'DISPUTED',
  'REFUNDED',
  'CANCELLED'
];

const MasterOrderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    financials: {
      cartSubtotal: { type: Number, default: 0, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      couponCode: { type: String, trim: true },
      totalTax: { type: Number, default: 0, min: 0 },
      totalDeliveryFee: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, default: 0, min: 0 }
    },
    paymentMethod: {
      type: String,
      enum: ['CHAPA', 'MANUAL'],
      required: true
    },
    receiptRef: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REVIEW_REQUIRED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      required: true
    },
    escrowStatus: {
      type: String,
      enum: ESCROW_STATUSES,
      default: 'PENDING_PAYMENT',
      required: true,
      index: true
    },
    receiptImageUrl: {
      type: String
    },
    receiptOcrResult: {
      ref: String,
      amount: Number,
      date: String,
      bankName: String,
      confidence: Number,
      status: String,
      rawText: String
    },
    paymentProviderMeta: {
      txRef: String,
      chapaEventId: String,
      rawWebhook: mongoose.Schema.Types.Mixed
    },
    deliveryAddress: {
      label: { type: String, default: 'Buyer delivery point' },
      coordinates: {
        type: [Number],
        default: [38.7600, 9.0100]
      }
    },
    reviewReason: String,
    vendorOrderIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorOrder'
    }]
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

module.exports = mongoose.model('MasterOrder', MasterOrderSchema);

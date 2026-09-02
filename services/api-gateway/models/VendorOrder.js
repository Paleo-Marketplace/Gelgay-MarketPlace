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

const VendorOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantSku: {
      type: String,
      trim: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    title: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const VendorOrderSchema = new mongoose.Schema(
  {
    masterOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterOrder',
      required: true,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true
    },
    items: [VendorOrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0
    },
    vendorPayout: {
      type: Number,
      required: true,
      min: 0
    },
    financials: {
      itemSubtotal: { type: Number, default: 0, min: 0 },
      taxCollected: { type: Number, default: 0, min: 0 },
      deliveryFee: { type: Number, default: 0, min: 0 },
      platformCommission: { type: Number, default: 0, min: 0 },
      vendorPayout: { type: Number, default: 0, min: 0 }
    },
    escrowStatus: {
      type: String,
      enum: ESCROW_STATUSES,
      default: 'PENDING_PAYMENT',
      required: true,
      index: true
    },
    fulfillmentStatus: {
      type: String,
      enum: ['AWAITING_PAYMENT', 'READY_TO_DISPATCH', 'IN_TRANSIT', 'DELIVERED', 'PAYOUT_RELEASED', 'DISPUTED', 'REFUNDED', 'CANCELLED'],
      default: 'AWAITING_PAYMENT',
      required: true,
      index: true
    },
    courierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    proofOfDeliveryUrl: String,
    deliveryOtp: {
      type: String,
      trim: true
    },
    vendorLocation: {
      label: { type: String, default: 'Vendor pickup point' },
      coordinates: {
        type: [Number],
        default: [38.7578, 9.0100]
      }
    },
    deliveryLocation: {
      label: { type: String, default: 'Buyer delivery point' },
      coordinates: {
        type: [Number],
        default: [38.7600, 9.0100]
      }
    }
  },
  {
    timestamps: true
  }
);

VendorOrderSchema.index({ vendorId: 1, fulfillmentStatus: 1 });

module.exports = mongoose.model('VendorOrder', VendorOrderSchema);

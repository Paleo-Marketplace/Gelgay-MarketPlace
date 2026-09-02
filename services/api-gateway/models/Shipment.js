const mongoose = require('mongoose');

const SHIPMENT_STATUSES = [
  'LABEL_CREATED',
  'PICKED_UP',
  'IN_SORTING_HUB',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURNED'
];

const TrackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      required: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },
  { _id: true }
);

const ShipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterOrder',
      required: true,
      index: true
    },
    vendorOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorOrder',
      index: true
    },
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    carrier: {
      type: String,
      default: 'PALEO Express Direct Fleet',
      trim: true
    },
    serviceLevel: {
      type: String,
      default: 'Curated Next-Day White Glove',
      trim: true
    },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: 'LABEL_CREATED',
      required: true,
      index: true
    },
    origin: {
      label: { type: String, default: 'PALEO Central Logistics Hub, Bole' },
      coordinates: { type: [Number], default: [38.7896, 8.9974] }
    },
    destination: {
      label: { type: String, default: 'Buyer Delivery Address' },
      recipientName: { type: String, trim: true },
      recipientPhone: { type: String, trim: true },
      coordinates: { type: [Number], default: [39.2820, 8.5380] }
    },
    currentLocation: {
      label: { type: String, default: 'Adama Central Dispatch Hub' },
      coordinates: { type: [Number], default: [39.2680, 8.5400] },
      updatedAt: { type: Date, default: Date.now }
    },
    driver: {
      name: { type: String, default: 'Abebe Tessema' },
      phone: { type: String, default: '+251 91 148 2910' },
      vehicle: { type: String, default: 'PALEO Electric Courier #04' },
      rating: { type: Number, default: 4.95 }
    },
    estimatedDelivery: {
      type: Date
    },
    shippedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    trackingEvents: [TrackingEventSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Shipment', ShipmentSchema);
module.exports.SHIPMENT_STATUSES = SHIPMENT_STATUSES;

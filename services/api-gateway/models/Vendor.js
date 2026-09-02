const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true
    },
    storeName: {
      type: String,
      required: true,
      trim: true
    },
    storeBio: {
      type: String,
      trim: true,
      default: ''
    },
    storeLogo: {
      type: String,
      trim: true
    },
    storeBanner: {
      type: String,
      trim: true
    },
    sellerType: {
      type: String,
      enum: ['individual', 'business'],
      default: 'individual'
    },
    legalName: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    nationalIdNumber: {
      type: String,
      trim: true
    },
    idDocumentUrl: {
      type: String,
      trim: true
    },
    businessLicenseUrl: {
      type: String,
      trim: true
    },
    agreedToTerms: {
      type: Boolean,
      default: false
    },
    agreedToTermsAt: {
      type: Date
    },
    payoutDetails: {
      bank: { type: String, trim: true, default: 'Commercial Bank of Ethiopia (CBE)' },
      account: { type: String, trim: true },
      accountHolder: { type: String, trim: true }
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
      required: true,
      index: true
    },
    kycFeedback: {
      type: String,
      trim: true
    },
    commissionRate: {
      type: Number,
      default: 0.025,
      min: 0,
      max: 1
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [39.2680, 8.5400]
      }
    },
    address: {
      type: String,
      trim: true,
      default: 'Adama, Ethiopia'
    },
    categories: {
      type: [String],
      default: ['Everyday Carry', 'Electronics']
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openingHours: {
      type: String,
      default: '09:00 AM - 08:00 PM'
    },
    pickupAvailable: {
      type: Boolean,
      default: true
    },
    deliveryAvailable: {
      type: Boolean,
      default: true
    },
    phone: {
      type: String,
      trim: true
    },
    vendorPayoutBalance: {
      available: { type: Number, default: 0, min: 0 },
      pending: { type: Number, default: 0, min: 0 },
      requested: { type: Number, default: 0, min: 0 }
    }
  },
  {
    timestamps: true
  }
);

VendorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Vendor', VendorSchema);

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0
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
    images: {
      type: [String],
      default: []
    },
    category: {
      type: String,
      trim: true,
      default: 'market'
    },
    condition: {
      type: String,
      enum: ['Like New', 'Excellent', 'Good', 'Restored'],
      default: 'Like New'
    },
    specs: {
      type: Map,
      of: String,
      default: {}
    },
    variants: [
      {
        sku: { type: String, trim: true },
        title: { type: String, trim: true },
        price: { type: Number, min: 0 },
        stock: { type: Number, min: 0, default: 1 },
        attributes: { type: Map, of: String }
      }
    ],
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

ProductSchema.index({ vendorId: 1, isPublished: 1, isArchived: 1 });
ProductSchema.index({ stock: 1, isPublished: 1, isArchived: 1 });
ProductSchema.index({ location: '2dsphere' });
ProductSchema.index({ title: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', ProductSchema);

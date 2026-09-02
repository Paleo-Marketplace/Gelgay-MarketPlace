const mongoose = require('mongoose');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const CommissionService = require('./CommissionService');
const MessagingService = require('./MessagingService');
const { ESCROW_STATUS, assertEscrowTransition } = require('../constants/orderStates');
const { emitOrderUpdate, emitStockUpdate } = require('./SocketService');

const normalizeMoney = (value) => Number(Number(value || 0).toFixed(2));

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

const normalizeCartItems = (items) => {
  const merged = new Map();
  for (const item of items || []) {
    if (!item.productId) {
      throw new Error('Each cart item must include productId');
    }

    const qty = Number(item.qty || item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Each cart item quantity must be a positive integer');
    }

    const variantSku = item.variantSku || item.sku || null;
    const key = variantSku ? `${item.productId}:${variantSku}` : item.productId.toString();
    merged.set(key, {
      productId: item.productId.toString(),
      variantSku,
      qty: (merged.get(key)?.qty || 0) + qty
    });
  }

  return [...merged.values()];
};

const normalizeDeliveryAddress = (deliveryAddress = {}) => {
  if (Array.isArray(deliveryAddress.coordinates)) {
    return {
      label: deliveryAddress.label || deliveryAddress.address || 'Buyer delivery point',
      coordinates: deliveryAddress.coordinates.map(Number)
    };
  }

  if (deliveryAddress.lng !== undefined && deliveryAddress.lat !== undefined) {
    return {
      label: deliveryAddress.label || deliveryAddress.address || 'Buyer delivery point',
      coordinates: [Number(deliveryAddress.lng), Number(deliveryAddress.lat)]
    };
  }

  return {
    label: 'Posta Bet / Bole, Adama',
    coordinates: [39.2705, 8.5415]
  };
};

const calculateDynamicDeliveryFee = (deliveryAddress, vendorCount = 1) => {
  const normAddress = normalizeDeliveryAddress(deliveryAddress);
  const addressLabel = (normAddress.label || '').toLowerCase();
  
  let baseDeliveryFee = 150; // Standard Adama Central courier
  if (addressLabel.includes('wonji') || addressLabel.includes('mojo')) {
    baseDeliveryFee = 250;
  } else if (addressLabel.includes('bishoftu') || addressLabel.includes('debre zeit')) {
    baseDeliveryFee = 350;
  } else if (addressLabel.includes('addis') || addressLabel.includes('finfinne')) {
    baseDeliveryFee = 450;
  }

  const count = Math.max(1, vendorCount);
  const multiVendorFee = (count - 1) * 50;
  return normalizeMoney(baseDeliveryFee + multiVendorFee);
};

class OrderService {
  static async resolveProduct(productId, session) {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    let product = null;
    if (isValidObjectId(productId)) {
      product = session ? await Product.findById(productId).session(session) : await Product.findById(productId);
    }

    // Fallback lookup if productId is a slug or mock ID (e.g., 'prod-1')
    if (!product) {
      const cleanKey = String(productId).replace(/^prod-/, '');
      const query = {
        isPublished: true,
        $or: [
          { slug: productId },
          { title: new RegExp(cleanKey, 'i') }
        ]
      };
      product = session ? await Product.findOne(query).session(session) : await Product.findOne(query);
    }

    // Secondary fallback for demo testing carts: map to first published in-stock product
    if (!product) {
      product = session
        ? await Product.findOne({ isPublished: true, stock: { $gt: 0 } }).session(session)
        : await Product.findOne({ isPublished: true, stock: { $gt: 0 } });
    }

    if (!product || !product.isPublished) {
      throw new Error(`Product ${productId} is no longer available or unpublished`);
    }
    return product;
  }

  static async calculateCartQuote({ items, deliveryAddress, couponCode }) {
    const cartItems = normalizeCartItems(items);
    if (!cartItems.length) {
      return {
        subtotal: 0,
        discount: 0,
        tax: 0,
        deliveryFee: 0,
        totalAmount: 0,
        vendorCount: 0,
        items: []
      };
    }

    const resolvedItems = [];
    const vendorIds = new Set();
    let subtotal = 0;

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isPublished) {
        continue;
      }

      let unitPrice = product.price;
      if (item.variantSku && Array.isArray(product.variants)) {
        const matched = product.variants.find((v) => v.sku === item.variantSku || v.title === item.variantSku);
        if (matched) {
          unitPrice = matched.price || product.price;
        }
      }

      const itemTotal = normalizeMoney(unitPrice * item.qty);
      subtotal += itemTotal;
      if (product.vendorId) {
        vendorIds.add(product.vendorId.toString());
      }

      resolvedItems.push({
        productId: product._id.toString(),
        title: product.title,
        price: unitPrice,
        qty: item.qty,
        image: product.images?.[0] || product.image || '',
        vendorId: product.vendorId?.toString() || null,
        itemTotal
      });
    }

    subtotal = normalizeMoney(subtotal);

    const normAddress = normalizeDeliveryAddress(deliveryAddress);
    const vendorCount = Math.max(1, vendorIds.size);
    const deliveryFee = calculateDynamicDeliveryFee(deliveryAddress, vendorCount);

    // Coupon discount logic
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
      if (coupon) {
        if (coupon.discountType === 'PERCENT') {
          discount = normalizeMoney((subtotal * coupon.discountValue) / 100);
        } else if (coupon.discountType === 'FIXED') {
          discount = normalizeMoney(Math.min(coupon.discountValue, subtotal));
        }
      }
    }

    const discountedSubtotal = Math.max(0, normalizeMoney(subtotal - discount));
    const tax = normalizeMoney(discountedSubtotal * 0.15);
    const totalAmount = normalizeMoney(discountedSubtotal + tax + deliveryFee);

    return {
      subtotal,
      discount,
      tax,
      deliveryFee,
      totalAmount,
      vendorCount,
      deliveryAddress: normAddress,
      items: resolvedItems
    };
  }

  static async createSplitOrder({ buyer, items, deliveryAddress, paymentMethod, couponCode }) {
    const cartItems = normalizeCartItems(items);
    if (!cartItems.length) {
      throw new Error('Cart items cannot be empty');
    }

    if (!['CHAPA', 'MANUAL'].includes(paymentMethod)) {
      throw new Error('paymentMethod must be CHAPA or MANUAL');
    }

    const session = await mongoose.startSession();
    const vendorGroups = new Map();
    let result;

    try {
      await session.withTransaction(async () => {
        vendorGroups.clear();
        let totalAmount = 0;

        for (const item of cartItems) {
          const product = await this.resolveProduct(item.productId, session);

          let unitPrice = product.price;
          let variantInfo = null;
          let matchedVariant = null;

          if (item.variantSku && Array.isArray(product.variants)) {
            matchedVariant = product.variants.find((v) => v.sku === item.variantSku || v.title === item.variantSku);
            if (matchedVariant) {
              unitPrice = matchedVariant.price || product.price;
              variantInfo = matchedVariant.title || matchedVariant.sku;
            }
          }

          const availableStock = product.stock;
          if (availableStock < item.qty) {
            throw new Error(`Out of stock for ${product.title}. Requested ${item.qty}, available ${Math.max(0, availableStock)}`);
          }

          if (matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock < item.qty) {
            throw new Error(`Out of stock for ${product.title} (${variantInfo || item.variantSku}). Requested ${item.qty}, available ${Math.max(0, matchedVariant.stock)}`);
          }

          let reserved;
          if (matchedVariant) {
            const vSku = matchedVariant.sku || item.variantSku;
            reserved = await Product.findOneAndUpdate(
              {
                _id: product._id,
                stock: { $gte: item.qty },
                variants: {
                  $elemMatch: {
                    sku: vSku,
                    stock: { $gte: item.qty }
                  }
                }
              },
              {
                $inc: {
                  stock: -item.qty,
                  reservedStock: item.qty,
                  'variants.$[v].stock': -item.qty
                }
              },
              {
                arrayFilters: [{ 'v.sku': vSku }],
                new: true,
                session
              }
            );
          } else {
            reserved = await Product.findOneAndUpdate(
              {
                _id: product._id,
                stock: { $gte: item.qty }
              },
              { $inc: { stock: -item.qty, reservedStock: item.qty } },
              { new: true, session }
            );
          }

          if (!reserved) {
            throw new Error(`Inventory changed while purchasing ${product.title}${variantInfo ? ` (${variantInfo})` : ''}. Please retry checkout.`);
          }

          const lineTotal = normalizeMoney(unitPrice * item.qty);
          totalAmount = normalizeMoney(totalAmount + lineTotal);

          const vendorId = product.vendorId.toString();
          const group = vendorGroups.get(vendorId) || {
            vendorId: product.vendorId,
            items: [],
            subtotal: 0
          };

          group.items.push({
            productId: product._id,
            variantSku: matchedVariant ? (matchedVariant.sku || item.variantSku) : (item.variantSku || undefined),
            title: variantInfo ? `${product.title} (${variantInfo})` : product.title,
            qty: item.qty,
            price: unitPrice
          });
          group.subtotal = normalizeMoney(group.subtotal + lineTotal);
          vendorGroups.set(vendorId, group);
        }

        const cartSubtotal = normalizeMoney(totalAmount);
        let discountAmount = 0;
        let appliedCoupon = null;

        if (couponCode) {
          const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim(), isActive: true }).session(session);
          if (coupon) {
            discountAmount = coupon.calculateDiscount(cartSubtotal);
            if (discountAmount > 0) {
              appliedCoupon = coupon.code;
              coupon.usedCount = (coupon.usedCount || 0) + 1;
              await coupon.save({ session });
            }
          }
        }

        const discountedSubtotal = Math.max(0, normalizeMoney(cartSubtotal - discountAmount));
        const totalTax = normalizeMoney(discountedSubtotal * 0.15);
        const totalDeliveryFee = calculateDynamicDeliveryFee(deliveryAddress, vendorGroups.size);
        const grandTotal = normalizeMoney(discountedSubtotal + totalTax + totalDeliveryFee);

        const [masterOrder] = await MasterOrder.create(
          [
            {
              buyerId: buyer.id || buyer._id,
              totalAmount: grandTotal,
              financials: {
                cartSubtotal,
                discountAmount,
                couponCode: appliedCoupon || undefined,
                totalTax,
                totalDeliveryFee,
                grandTotal
              },
              paymentMethod,
              paymentStatus: 'PENDING',
              escrowStatus: ESCROW_STATUS.PENDING_PAYMENT,
              deliveryAddress: normalizeDeliveryAddress(deliveryAddress)
            }
          ],
          { session }
        );

        const vendorOrders = [];
        for (const group of vendorGroups.values()) {
          const vendor = await Vendor.findById(group.vendorId).session(session);
          if (!vendor || vendor.kycStatus !== 'approved') {
            throw new Error('One or more vendors are not approved for checkout');
          }

          const itemSubtotal = group.subtotal;
          const taxCollected = normalizeMoney(itemSubtotal * 0.15);
          const deliveryFee = normalizeMoney(totalDeliveryFee / vendorGroups.size);
          const { platformFee, vendorPayout } = CommissionService.platformFeeFor(itemSubtotal, vendor);

          const [vendorOrder] = await VendorOrder.create(
            [
              {
                masterOrderId: masterOrder._id,
                vendorId: group.vendorId,
                items: group.items,
                subtotal: itemSubtotal,
                platformFee,
                vendorPayout,
                financials: {
                  itemSubtotal,
                  taxCollected,
                  deliveryFee,
                  platformCommission: platformFee,
                  vendorPayout
                },
                deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
                escrowStatus: ESCROW_STATUS.PENDING_PAYMENT,
                fulfillmentStatus: 'AWAITING_PAYMENT',
                vendorLocation: {
                  label: vendor.address || 'Vendor location',
                  coordinates: (vendor.location && vendor.location.coordinates) || [38.7578, 9.0100]
                },
                deliveryLocation: {
                  label: masterOrder.deliveryAddress.label,
                  coordinates: masterOrder.deliveryAddress.coordinates
                }
              }
            ],
            { session }
          );

          vendorOrders.push(vendorOrder);
          masterOrder.vendorOrderIds.push(vendorOrder._id);
        }

        await masterOrder.save({ session });
        result = { masterOrder, vendorOrders };
      });

      // Emit real-time inventory updates for all purchased items
      for (const group of vendorGroups.values()) {
        for (const it of group.items) {
          const fresh = await Product.findById(it.productId);
          if (fresh) {
            emitStockUpdate(fresh._id.toString(), fresh.stock, fresh.stock <= 0);
          }
        }
      }

      const vendors = await Vendor.find({ _id: { $in: result.vendorOrders.map((order) => order.vendorId) } }).populate('userId');
      await Promise.all(
        result.vendorOrders.map((vendorOrder) => {
          const vendor = vendors.find((candidate) => candidate._id.toString() === vendorOrder.vendorId.toString());
          return MessagingService.notifyVendorOrderCreated(vendor && vendor.userId, vendorOrder);
        })
      );

      return result;
    } finally {
      session.endSession();
    }
  }

  static async holdFundsForMasterOrder(masterOrderId, paymentMeta = {}) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const masterOrder = await MasterOrder.findById(masterOrderId).session(session);
        if (!masterOrder) {
          throw new Error('Master order not found');
        }

        if (masterOrder.escrowStatus !== ESCROW_STATUS.PENDING_PAYMENT) {
          result = {
            masterOrder,
            vendorOrders: await VendorOrder.find({ masterOrderId }).session(session),
            idempotent: true
          };
          return;
        }

        assertEscrowTransition(masterOrder.escrowStatus, ESCROW_STATUS.FUNDS_HELD_IN_ESCROW);
        masterOrder.escrowStatus = ESCROW_STATUS.FUNDS_HELD_IN_ESCROW;
        masterOrder.paymentStatus = 'PAID';
        if (paymentMeta.receiptRef) masterOrder.receiptRef = paymentMeta.receiptRef;
        if (paymentMeta.receiptOcrResult) masterOrder.receiptOcrResult = paymentMeta.receiptOcrResult;
        if (paymentMeta.receiptImageUrl) masterOrder.receiptImageUrl = paymentMeta.receiptImageUrl;
        if (paymentMeta.paymentProviderMeta) masterOrder.paymentProviderMeta = paymentMeta.paymentProviderMeta;
        await masterOrder.save({ session });

        await VendorOrder.updateMany(
          { masterOrderId: masterOrder._id },
          {
            escrowStatus: ESCROW_STATUS.FUNDS_HELD_IN_ESCROW,
            fulfillmentStatus: 'READY_TO_DISPATCH'
          },
          { session }
        );

        const vendorOrders = await VendorOrder.find({ masterOrderId: masterOrder._id }).session(session);

        for (const vendorOrder of vendorOrders) {
          for (const item of vendorOrder.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { reservedStock: -item.qty } },
              { session }
            );
          }
        }

        result = { masterOrder, vendorOrders, idempotent: false };
      });

      emitOrderUpdate(masterOrderId.toString(), {
        escrowStatus: ESCROW_STATUS.FUNDS_HELD_IN_ESCROW,
        paymentStatus: 'PAID'
      });

      return result;
    } finally {
      session.endSession();
    }
  }

  static async flagManualReview(masterOrder, reason, receiptMeta = {}) {
    masterOrder.paymentStatus = 'REVIEW_REQUIRED';
    masterOrder.reviewReason = reason;
    if (receiptMeta.receiptRef) masterOrder.receiptRef = receiptMeta.receiptRef;
    if (receiptMeta.receiptImageUrl) masterOrder.receiptImageUrl = receiptMeta.receiptImageUrl;
    if (receiptMeta.receiptOcrResult) masterOrder.receiptOcrResult = receiptMeta.receiptOcrResult;
    await masterOrder.save();
    return masterOrder;
  }

  static async verifyManualReceipt({ buyerId, masterOrderId, receiptImageUrl, ocrResult }) {
    const masterOrder = await MasterOrder.findById(masterOrderId);
    if (!masterOrder) {
      throw new Error('Master order not found');
    }

    if (masterOrder.buyerId.toString() !== buyerId) {
      const error = new Error('Order does not belong to authenticated buyer');
      error.status = 403;
      throw error;
    }

    const receiptRef = ocrResult.ref;
    const receiptMeta = {
      receiptRef,
      receiptImageUrl,
      receiptOcrResult: ocrResult
    };

    if (!receiptRef || !Number.isFinite(ocrResult.amount)) {
      const reviewed = await this.flagManualReview(masterOrder, 'OCR could not extract reference and amount', receiptMeta);
      return { needsReview: true, masterOrder: reviewed, vendorOrders: await VendorOrder.find({ masterOrderId }) };
    }

    const duplicate = await MasterOrder.findOne({
      _id: { $ne: masterOrder._id },
      receiptRef
    });

    if (duplicate) {
      const reviewed = await this.flagManualReview(masterOrder, `Receipt reference ${receiptRef} is already used`, receiptMeta);
      return { needsReview: true, masterOrder: reviewed, vendorOrders: await VendorOrder.find({ masterOrderId }) };
    }

    const ocrAmount = normalizeMoney(ocrResult.amount);
    const expectedAmount = normalizeMoney(masterOrder.totalAmount);

    if (Math.abs(ocrAmount - expectedAmount) > 0.01) {
      const reviewed = await this.flagManualReview(
        masterOrder,
        `OCR amount ${ocrAmount} ETB does not match order amount ${expectedAmount} ETB`,
        receiptMeta
      );
      return { needsReview: true, masterOrder: reviewed, vendorOrders: await VendorOrder.find({ masterOrderId }) };
    }

    return {
      needsReview: false,
      ...(await this.holdFundsForMasterOrder(masterOrderId, receiptMeta))
    };
  }

  static async transitionVendorOrder(vendorOrderId, targetStatus, actor = {}) {
    const vendorOrder = await VendorOrder.findById(vendorOrderId);
    if (!vendorOrder) {
      throw new Error('Vendor order not found');
    }

    if (actor.role === 'vendor' && vendorOrder.vendorId.toString() !== actor.vendorId) {
      const error = new Error('Vendor order does not belong to authenticated vendor');
      error.status = 403;
      throw error;
    }

    assertEscrowTransition(vendorOrder.escrowStatus, targetStatus);
    vendorOrder.escrowStatus = targetStatus;

    if (targetStatus === ESCROW_STATUS.DISPATCHED) vendorOrder.fulfillmentStatus = 'IN_TRANSIT';
    if (targetStatus === ESCROW_STATUS.DELIVERED) vendorOrder.fulfillmentStatus = 'DELIVERED';
    if (targetStatus === ESCROW_STATUS.DISPUTED) vendorOrder.fulfillmentStatus = 'DISPUTED';
    if (targetStatus === ESCROW_STATUS.FUNDS_RELEASED) vendorOrder.fulfillmentStatus = 'PAYOUT_RELEASED';
    if (targetStatus === ESCROW_STATUS.REFUNDED) vendorOrder.fulfillmentStatus = 'REFUNDED';
    if (targetStatus === ESCROW_STATUS.CANCELLED) vendorOrder.fulfillmentStatus = 'CANCELLED';

    await vendorOrder.save();
    await this.recalculateMasterEscrowStatus(vendorOrder.masterOrderId);

    if (targetStatus === ESCROW_STATUS.DISPATCHED) {
      const masterOrder = await MasterOrder.findById(vendorOrder.masterOrderId).populate('buyerId');
      await MessagingService.notifyOrderDispatched(masterOrder && masterOrder.buyerId, vendorOrder);
    }

    emitOrderUpdate(vendorOrder.masterOrderId.toString(), {
      vendorOrderId: vendorOrder._id.toString(),
      escrowStatus: targetStatus,
      fulfillmentStatus: vendorOrder.fulfillmentStatus
    });

    return vendorOrder;
  }

  static async releaseVendorEscrow(vendorOrderId) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const vendorOrder = await VendorOrder.findById(vendorOrderId).session(session);
        if (!vendorOrder) {
          throw new Error('Vendor order not found');
        }

        assertEscrowTransition(vendorOrder.escrowStatus, ESCROW_STATUS.FUNDS_RELEASED);
        vendorOrder.escrowStatus = ESCROW_STATUS.FUNDS_RELEASED;
        vendorOrder.fulfillmentStatus = 'PAYOUT_RELEASED';
        await vendorOrder.save({ session });

        await Vendor.findByIdAndUpdate(
          vendorOrder.vendorId,
          { $inc: { 'vendorPayoutBalance.available': vendorOrder.vendorPayout } },
          { session }
        );

        result = vendorOrder;
      });

      await this.recalculateMasterEscrowStatus(result.masterOrderId);

      const masterOrder = await MasterOrder.findById(result.masterOrderId).populate('buyerId');
      const vendor = await Vendor.findById(result.vendorId).populate('userId');
      await MessagingService.notifyDeliveryAndRelease({
        buyer: masterOrder && masterOrder.buyerId,
        vendorUser: vendor && vendor.userId,
        vendorOrder: result
      });

      emitOrderUpdate(result.masterOrderId.toString(), {
        vendorOrderId: result._id.toString(),
        escrowStatus: ESCROW_STATUS.FUNDS_RELEASED,
        fulfillmentStatus: 'PAYOUT_RELEASED'
      });

      return result;
    } finally {
      session.endSession();
    }
  }

  static async refundVendorEscrow(vendorOrderId, reason = 'Dispute resolved in favor of buyer', actor = {}) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const vendorOrder = await VendorOrder.findById(vendorOrderId).session(session);
        if (!vendorOrder) {
          throw new Error('Vendor order not found');
        }

        assertEscrowTransition(vendorOrder.escrowStatus, ESCROW_STATUS.REFUNDED);
        vendorOrder.escrowStatus = ESCROW_STATUS.REFUNDED;
        vendorOrder.fulfillmentStatus = 'REFUNDED';
        await vendorOrder.save({ session });

        result = vendorOrder;
      });

      await this.recalculateMasterEscrowStatus(result.masterOrderId);

      emitOrderUpdate(result.masterOrderId.toString(), {
        vendorOrderId: result._id.toString(),
        escrowStatus: ESCROW_STATUS.REFUNDED,
        fulfillmentStatus: 'REFUNDED',
        reason
      });

      return result;
    } finally {
      session.endSession();
    }
  }

  static async cancelVendorOrder(vendorOrderId, actor = {}) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const vendorOrder = await VendorOrder.findById(vendorOrderId).session(session);
        if (!vendorOrder) {
          throw new Error('Vendor order not found');
        }

        const masterOrder = await MasterOrder.findById(vendorOrder.masterOrderId).session(session);
        if (!masterOrder) {
          throw new Error('Master order not found');
        }

        const isBuyer = actor.id && masterOrder.buyerId.toString() === actor.id;
        const isVendor = actor.vendorId && vendorOrder.vendorId.toString() === actor.vendorId;
        const isAdmin = actor.role === 'admin';

        if (!isBuyer && !isVendor && !isAdmin) {
          const error = new Error('Unauthorized to cancel this vendor order');
          error.status = 403;
          throw error;
        }

        const targetStatus = vendorOrder.escrowStatus === ESCROW_STATUS.PENDING_PAYMENT
          ? ESCROW_STATUS.CANCELLED
          : ESCROW_STATUS.REFUNDED;

        assertEscrowTransition(vendorOrder.escrowStatus, targetStatus);
        vendorOrder.escrowStatus = targetStatus;
        vendorOrder.fulfillmentStatus = targetStatus === ESCROW_STATUS.CANCELLED ? 'CANCELLED' : 'REFUNDED';
        await vendorOrder.save({ session });

        // Restore reserved inventory for items in this vendor order
        for (const item of vendorOrder.items) {
          if (item.variantSku) {
            await Product.updateOne(
              { _id: item.productId, 'variants.sku': item.variantSku },
              {
                $inc: {
                  stock: item.qty,
                  reservedStock: -item.qty,
                  'variants.$[v].stock': item.qty
                }
              },
              {
                arrayFilters: [{ 'v.sku': item.variantSku }],
                session
              }
            );
          } else {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.qty, reservedStock: -item.qty } },
              { session }
            );
          }
        }

        result = vendorOrder;
      });

      await this.recalculateMasterEscrowStatus(result.masterOrderId);

      // Emit stock updates for cancelled products
      for (const item of result.items) {
        const fresh = await Product.findById(item.productId);
        if (fresh) {
          emitStockUpdate(fresh._id.toString(), fresh.stock, fresh.stock <= 0);
        }
      }

      emitOrderUpdate(result.masterOrderId.toString(), {
        vendorOrderId: result._id.toString(),
        escrowStatus: result.escrowStatus,
        fulfillmentStatus: result.fulfillmentStatus
      });

      return result;
    } finally {
      session.endSession();
    }
  }

  static async recalculateMasterEscrowStatus(masterOrderId) {
    const vendorOrders = await VendorOrder.find({ masterOrderId });
    const masterOrder = await MasterOrder.findById(masterOrderId);
    if (!masterOrder || !vendorOrders.length) return masterOrder;

    if (vendorOrders.some((order) => order.escrowStatus === ESCROW_STATUS.DISPUTED)) {
      masterOrder.escrowStatus = ESCROW_STATUS.DISPUTED;
    } else if (vendorOrders.every((order) => order.escrowStatus === ESCROW_STATUS.FUNDS_RELEASED)) {
      masterOrder.escrowStatus = ESCROW_STATUS.FUNDS_RELEASED;
      masterOrder.paymentStatus = 'PAID';
    } else if (vendorOrders.every((order) => [ESCROW_STATUS.REFUNDED, ESCROW_STATUS.CANCELLED].includes(order.escrowStatus))) {
      masterOrder.escrowStatus = vendorOrders.some((o) => o.escrowStatus === ESCROW_STATUS.REFUNDED)
        ? ESCROW_STATUS.REFUNDED
        : ESCROW_STATUS.CANCELLED;
      masterOrder.paymentStatus = masterOrder.escrowStatus === ESCROW_STATUS.REFUNDED ? 'REFUNDED' : 'FAILED';
    } else if (vendorOrders.every((order) => [ESCROW_STATUS.DELIVERED, ESCROW_STATUS.FUNDS_RELEASED, ESCROW_STATUS.REFUNDED, ESCROW_STATUS.CANCELLED].includes(order.escrowStatus))) {
      masterOrder.escrowStatus = ESCROW_STATUS.DELIVERED;
    } else if (vendorOrders.some((order) => order.escrowStatus === ESCROW_STATUS.DISPATCHED)) {
      masterOrder.escrowStatus = ESCROW_STATUS.DISPATCHED;
    } else if (vendorOrders.every((order) => [ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.REFUNDED, ESCROW_STATUS.CANCELLED].includes(order.escrowStatus))) {
      masterOrder.escrowStatus = ESCROW_STATUS.FUNDS_HELD_IN_ESCROW;
    }

    await masterOrder.save();
    return masterOrder;
  }

  static async releaseReservationsForOrder(masterOrderId) {
    const vendorOrders = await VendorOrder.find({ masterOrderId });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const vendorOrder of vendorOrders) {
          for (const item of vendorOrder.items) {
            if (item.variantSku) {
              await Product.updateOne(
                { _id: item.productId, 'variants.sku': item.variantSku },
                {
                  $inc: {
                    stock: item.qty,
                    reservedStock: -item.qty,
                    'variants.$[v].stock': item.qty
                  }
                },
                {
                  arrayFilters: [{ 'v.sku': item.variantSku }],
                  session
                }
              );
            } else {
              await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.qty, reservedStock: -item.qty } },
                { session }
              );
            }
          }
        }

        await MasterOrder.findByIdAndUpdate(masterOrderId, { paymentStatus: 'FAILED' }, { session });
      });

      for (const vendorOrder of vendorOrders) {
        for (const item of vendorOrder.items) {
          const fresh = await Product.findById(item.productId);
          if (fresh) {
            emitStockUpdate(fresh._id.toString(), fresh.stock, fresh.stock <= 0);
          }
        }
      }
    } finally {
      session.endSession();
    }
  }

  /**
   * Finds pending, unpaid orders older than threshold (default 30 min),
   * cancels them and atomically releases their reservedStock back to available stock.
   */
  static async cleanupExpiredOrders({ olderThanMinutes = 30 } = {}) {
    const expirationThreshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const expiredOrders = await MasterOrder.find({
      paymentStatus: 'PENDING',
      escrowStatus: ESCROW_STATUS.PENDING_PAYMENT,
      createdAt: { $lte: expirationThreshold }
    });

    if (!expiredOrders.length) {
      return { processedCount: 0, orderIds: [] };
    }

    const processedIds = [];

    for (const masterOrder of expiredOrders) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const freshOrder = await MasterOrder.findById(masterOrder._id).session(session);
          if (!freshOrder || freshOrder.paymentStatus !== 'PENDING' || freshOrder.escrowStatus !== ESCROW_STATUS.PENDING_PAYMENT) {
            return;
          }

          const vendorOrders = await VendorOrder.find({ masterOrderId: freshOrder._id }).session(session);

          for (const vendorOrder of vendorOrders) {
            for (const item of vendorOrder.items) {
              if (item.variantSku) {
                await Product.updateOne(
                  { _id: item.productId, 'variants.sku': item.variantSku },
                  {
                    $inc: {
                      stock: item.qty,
                      reservedStock: -item.qty,
                      'variants.$[v].stock': item.qty
                    }
                  },
                  {
                    arrayFilters: [{ 'v.sku': item.variantSku }],
                    session
                  }
                );
              } else {
                await Product.updateOne(
                  { _id: item.productId },
                  { $inc: { stock: item.qty, reservedStock: -item.qty } },
                  { session }
                );
              }
            }

            vendorOrder.fulfillmentStatus = 'AWAITING_PAYMENT';
            await vendorOrder.save({ session });
          }

          freshOrder.paymentStatus = 'FAILED';
          freshOrder.reviewReason = `Order expired and automatically cancelled after ${olderThanMinutes} minutes of non-payment.`;
          await freshOrder.save({ session });

          processedIds.push(freshOrder._id.toString());
        });

        if (processedIds.includes(masterOrder._id.toString())) {
          emitOrderUpdate(masterOrder._id.toString(), {
            paymentStatus: 'FAILED',
            reviewReason: `Order expired and automatically cancelled after ${olderThanMinutes} minutes of non-payment.`
          });

          const vendorOrders = await VendorOrder.find({ masterOrderId: masterOrder._id });
          for (const vOrder of vendorOrders) {
            for (const item of vOrder.items) {
              const freshProduct = await Product.findById(item.productId);
              if (freshProduct) {
                emitStockUpdate(freshProduct._id.toString(), freshProduct.stock, freshProduct.stock <= 0);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Inventory Cleanup] Failed to cleanup expired order ${masterOrder._id}:`, err.message);
      } finally {
        session.endSession();
      }
    }

    if (processedIds.length > 0) {
      console.log(`[Inventory Cleanup] Cleaned up ${processedIds.length} expired order(s) and restored reserved inventory:`, processedIds);
    }

    return { processedCount: processedIds.length, orderIds: processedIds };
  }

  static async markPaymentHeldInEscrow(masterOrderId, paymentMeta = {}) {
    return this.holdFundsForMasterOrder(masterOrderId, paymentMeta);
  }

  static async releaseFundsToVendor(vendorOrderId) {
    return this.releaseVendorEscrow(vendorOrderId);
  }
}

module.exports = OrderService;


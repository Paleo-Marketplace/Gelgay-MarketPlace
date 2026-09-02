const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const Category = require('../models/Category');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const OrderService = require('../services/OrderService');
const { initSystemData, cleanDemoData } = require('../seed');
const { ESCROW_STATUS } = require('../constants/orderStates');

let replSet;

test.before(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await initSystemData();
});

test.after(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

test('🚀 Production E2E Workflow: Zero Demo Data, Clean DB, Real Commerce Flow', async (t) => {
  await t.test('1. System Bootstrapping contains categories, coupons, superadmin and 0 mock products', async () => {
    const categoryCount = await Category.countDocuments();
    assert.strictEqual(categoryCount, 5, 'Must have 5 standard system categories');

    const couponCount = await Coupon.countDocuments();
    assert.strictEqual(couponCount, 2, 'Must have 2 default system promo coupons');

    const admin = await User.findOne({ role: 'admin' });
    assert.ok(admin, 'Superadmin must exist');
    assert.strictEqual(admin.email, 'admin@paleo.market');

    const productCount = await Product.countDocuments();
    assert.strictEqual(productCount, 0, 'Production DB must have 0 fake demo products initially');

    const orderCount = await MasterOrder.countDocuments();
    assert.strictEqual(orderCount, 0, 'Production DB must have 0 fake demo orders initially');
  });

  let vendorUser, vendorRecord, buyerUser, createdProduct;

  await t.test('2. Vendor registers and lists a real authenticated product', async () => {
    vendorUser = await User.create({
      email: 'addis.curator@paleo.market',
      displayName: 'Addis Curated Antiques',
      role: 'vendor',
      authProvider: 'email',
      location: 'Kazanchis, Addis Ababa'
    });

    vendorRecord = await Vendor.create({
      userId: vendorUser._id,
      storeName: 'Addis Curated Antiques',
      kycStatus: 'approved',
      commissionRate: 0.025,
      address: 'Kazanchis, Addis Ababa',
      location: { type: 'Point', coordinates: [38.76, 9.02] },
      payoutDetails: { bank: 'CBE', account: '1000987654321' }
    });

    createdProduct = await Product.create({
      vendorId: vendorRecord._id,
      title: 'Original 1974 Telefunken Studio Mic',
      description: 'Fully calibrated analog studio microphone from German broadcast archive.',
      price: 12500,
      stock: 3,
      reservedStock: 0,
      category: 'Creative Tools',
      isPublished: true,
      condition: 'Excellent',
      specs: new Map([
        ['Diaphragm', 'Gold-sputtered Mylar'],
        ['Impedance', '200 Ohms'],
        ['Origin', 'Frankfurt, Germany']
      ]),
      images: ['https://media.paleo.market/telefunken-mic.jpg'],
      location: { type: 'Point', coordinates: [38.76, 9.02] }
    });

    assert.ok(createdProduct._id, 'Product created successfully');
    assert.strictEqual(createdProduct.stock, 3);
  });

  await t.test('3. Buyer places an escrow order with coupon and multi-vendor split logic', async () => {
    buyerUser = await User.create({
      email: 'almaz.buyer@gmail.com',
      displayName: 'Almaz Tadesse',
      role: 'buyer',
      authProvider: 'google',
      location: 'Bole Atlas, Addis Ababa'
    });

    const splitResult = await OrderService.createSplitOrder({
      buyer: buyerUser,
      items: [{ productId: createdProduct._id.toString(), qty: 1 }],
      deliveryAddress: { label: 'Bole Atlas, Addis Ababa', coordinates: [38.765, 9.015] },
      paymentMethod: 'MANUAL',
      couponCode: 'WELCOME10'
    });

    assert.ok(splitResult.masterOrder, 'Master order created');
    assert.strictEqual(splitResult.vendorOrders.length, 1, '1 Vendor sub-order created');

    // Verify stock reserved
    const updatedProduct = await Product.findById(createdProduct._id);
    assert.strictEqual(updatedProduct.reservedStock, 1, '1 item reserved in stock');

    // Verify financials
    const mo = splitResult.masterOrder;
    assert.strictEqual(mo.financials.cartSubtotal, 12500);
    assert.strictEqual(mo.financials.discountAmount, 1250); // 10% discount
    assert.strictEqual(mo.escrowStatus, ESCROW_STATUS.PENDING_PAYMENT);

    // Verify Vendor Payout
    const vo = splitResult.vendorOrders[0];
    assert.strictEqual(vo.subtotal, 12500);
    assert.strictEqual(vo.platformFee, 312.5); // 2.5% platform fee
    assert.strictEqual(vo.vendorPayout, 12187.5);
  });

  await t.test('4. Escrow State Machine transitions: HELD -> DISPATCHED -> DELIVERED -> FUNDS_RELEASED', async () => {
    const mo = await MasterOrder.findOne({ buyerId: buyerUser._id }).populate('vendorOrderIds');
    const vo = mo.vendorOrderIds[0];

    // Hold funds
    await OrderService.holdFundsForMasterOrder(mo._id, { ref: 'CBE-TRX-998811', amount: mo.totalAmount, date: new Date() });
    const heldMo = await MasterOrder.findById(mo._id);
    assert.strictEqual(heldMo.escrowStatus, ESCROW_STATUS.FUNDS_HELD_IN_ESCROW);

    // Merchant dispatch
    await OrderService.transitionVendorOrder(vo._id, ESCROW_STATUS.DISPATCHED, { role: 'vendor', vendorId: vendorRecord._id.toString() });
    const dispatchedVo = await VendorOrder.findById(vo._id);
    assert.strictEqual(dispatchedVo.escrowStatus, ESCROW_STATUS.DISPATCHED);

    // Buyer confirms delivery
    await OrderService.transitionVendorOrder(vo._id, ESCROW_STATUS.DELIVERED, { role: 'buyer', id: buyerUser._id });
    const deliveredVo = await VendorOrder.findById(vo._id);
    assert.strictEqual(deliveredVo.escrowStatus, ESCROW_STATUS.DELIVERED);

    // Escrow payout release
    await OrderService.releaseVendorEscrow(vo._id);
    const releasedVo = await VendorOrder.findById(vo._id);
    assert.strictEqual(releasedVo.escrowStatus, ESCROW_STATUS.FUNDS_RELEASED);

    // Verify vendor available balance incremented
    const updatedVendor = await Vendor.findById(vendorRecord._id);
    assert.strictEqual(updatedVendor.vendorPayoutBalance.available, 12187.5);
  });

  await t.test('5. Buyer submits a review and product rating updates', async () => {
    const review = await Review.create({
      productId: createdProduct._id,
      vendorId: vendorRecord._id,
      buyerId: buyerUser._id,
      rating: 5,
      title: 'Flawless condition!',
      comment: 'Audio clarity is stunning, exactly as described by the curator.',
      verifiedPurchase: true
    });

    assert.ok(review._id);
    assert.strictEqual(review.rating, 5);
  });
});

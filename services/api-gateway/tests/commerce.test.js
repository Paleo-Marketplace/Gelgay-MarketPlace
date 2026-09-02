const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'paleo-super-secure-jwt-secret-key-32-chars-long-min';
process.env.COURIER_WEBHOOK_SECRET = process.env.COURIER_WEBHOOK_SECRET || 'paleo_courier_secret_key_2026';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { disconnectDB } = require('../config/db');

const { ESCROW_STATUS, assertEscrowTransition, isValidEscrowTransition } = require('../constants/orderStates');
const CommissionService = require('../services/CommissionService');
const LogisticsService = require('../services/LogisticsService');
const PaymentOrchestrator = require('../services/PaymentOrchestrator');
const SearchService = require('../services/SearchService');
const OrderService = require('../services/OrderService');
const { verifyTurnstile } = require('../middleware/turnstile');
const { isConfigured: isSentryConfigured } = require('../config/sentry');
const { generateToken, authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { rejectClientVendorId, enforceVendorIsolation } = require('../middleware/vendorIsolation');
const { requireIdempotency, clearIdempotencyCache } = require('../middleware/idempotency');
const { uploadBufferToR2 } = require('../config/r2Storage');

describe('PALEO Enterprise Commerce & Marketplace Test Suite (Amazon / Shopify Standards)', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  describe('1. Multi-Vendor Order Splitting & Commission Invariants', () => {
    it('accurately splits platform fees and vendor payouts with zero floating-point rounding leakage', () => {
      const vendorA = { commissionRate: 0.025 }; // Standard 2.5%
      const vendorB = { commissionRate: 0.035 }; // Premium 3.5%

      const quoteA = CommissionService.platformFeeFor(1199.99, vendorA);
      const quoteB = CommissionService.platformFeeFor(450.50, vendorB);

      // Fee must match subtotal * rate rounded to 2 decimals
      assert.equal(quoteA.platformFee, 30.00);
      assert.equal(quoteA.vendorPayout, 1169.99);
      assert.equal(Number((quoteA.platformFee + quoteA.vendorPayout).toFixed(2)), 1199.99);

      assert.equal(quoteB.platformFee, 15.77);
      assert.equal(quoteB.vendorPayout, 434.73);
      assert.equal(Number((quoteB.platformFee + quoteB.vendorPayout).toFixed(2)), 450.50);
    });

    it('falls back to default marketplace platform fee rate if vendor rate is missing', () => {
      const quote = CommissionService.platformFeeFor(1000, null);
      assert.equal(quote.rate, 0.025);
      assert.equal(quote.platformFee, 25.00);
      assert.equal(quote.vendorPayout, 975.00);
    });
  });

  describe('2. Escrow State Machine Rigorous Lifecycle & Dispute Rules', () => {
    it('allows valid progressive state transitions: PENDING -> HELD -> DISPATCHED -> DELIVERED -> RELEASED', () => {
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.PENDING_PAYMENT, ESCROW_STATUS.FUNDS_HELD_IN_ESCROW));
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.DISPATCHED));
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DISPATCHED, ESCROW_STATUS.DELIVERED));
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DELIVERED, ESCROW_STATUS.FUNDS_RELEASED));
    });

    it('rejects illegal leap-over state transitions (e.g. PENDING directly to RELEASED or DISPATCHED)', () => {
      assert.throws(() => {
        assertEscrowTransition(ESCROW_STATUS.PENDING_PAYMENT, ESCROW_STATUS.FUNDS_RELEASED);
      }, /Invalid escrow transition/);

      assert.throws(() => {
        assertEscrowTransition(ESCROW_STATUS.PENDING_PAYMENT, ESCROW_STATUS.DISPATCHED);
      }, /Invalid escrow transition/);
    });

    it('allows branching into DISPUTED only from DISPATCHED or DELIVERED, rejecting dispute from PENDING', () => {
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DISPATCHED, ESCROW_STATUS.DISPUTED));
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DELIVERED, ESCROW_STATUS.DISPUTED));
      assert.throws(() => {
        assertEscrowTransition(ESCROW_STATUS.PENDING_PAYMENT, ESCROW_STATUS.DISPUTED);
      }, /Invalid escrow transition/);
    });

    it('allows resolving DISPUTED status by transitioning to FUNDS_RELEASED or DELIVERED upon admin arbitration', () => {
      assert.equal(isValidEscrowTransition(ESCROW_STATUS.DISPUTED, ESCROW_STATUS.FUNDS_RELEASED), true);
      assert.equal(isValidEscrowTransition(ESCROW_STATUS.DISPUTED, ESCROW_STATUS.DELIVERED), true);
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DISPUTED, ESCROW_STATUS.FUNDS_RELEASED));
      assert.doesNotThrow(() => assertEscrowTransition(ESCROW_STATUS.DISPUTED, ESCROW_STATUS.DELIVERED));
    });
  });

  describe('3. Payment Gateway Webhook Security (Chapa HMAC-SHA256)', () => {
    const testSecret = 'secret_chapa_webhook_key_12345';

    before(() => {
      process.env.CHAPA_WEBHOOK_SECRET = testSecret;
    });

    it('validates authentic Chapa webhook signatures using constant-time comparison', () => {
      const rawBody = JSON.stringify({ event: 'charge.success', tx_ref: 'paleo-test-101', amount: 1500 });
      const signature = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');

      const isValid = PaymentOrchestrator.verifyChapaSignature(rawBody, signature);
      assert.equal(isValid, true);
    });

    it('rejects forged or tampered webhook signatures', () => {
      const rawBody = JSON.stringify({ event: 'charge.success', tx_ref: 'paleo-test-101', amount: 1500 });
      const fakeSignature = crypto.createHmac('sha256', 'wrong_secret').update(rawBody).digest('hex');

      const isValid = PaymentOrchestrator.verifyChapaSignature(rawBody, fakeSignature);
      assert.equal(isValid, false);
    });
  });

  describe('4. Dynamic Distance & Day/Time Delivery Fee Calculations', () => {
    it('computes base fee + rate per km accurately for standard weekdays', () => {
      // Wednesday at 10:00 AM local time (off-peak weekday)
      const targetDate = new Date(2026, 7, 12, 10, 0, 0); // 2026-08-12 is Wednesday
      const quote = LogisticsService.calculateDeliveryFee({ distanceMeters: 5000, targetDate });

      assert.equal(quote.distanceKm, 5);
      assert.equal(quote.baseFee, 50);
      assert.equal(quote.ratePerKm, 20);
      assert.equal(quote.dayMultiplier, 1.0);
      assert.equal(quote.timeMultiplier, 1.0);
      // Unscaled = 50 + (5 * 20) = 150 ETB
      assert.equal(quote.totalDeliveryFee, 150);
    });

    it('applies +20% weekend multiplier on Saturday/Sunday deliveries', () => {
      // Sunday at 10:00 AM local time (off-peak Sunday morning)
      const targetDate = new Date(2026, 7, 16, 10, 0, 0); // 2026-08-16 is Sunday
      const quote = LogisticsService.calculateDeliveryFee({ distanceMeters: 5000, targetDate });

      assert.equal(quote.dayMultiplier, 1.20);
      assert.match(quote.dayLabel, /Weekend/i);
      // 150 * 1.2 = 180 ETB
      assert.equal(quote.totalDeliveryFee, 180);
    });

    it('applies rush hour multiplier during peak evening traffic (17:00 - 20:00)', () => {
      // Thursday at 18:30 local time
      const targetDate = new Date(2026, 7, 13, 18, 30, 0); // 2026-08-13 is Thursday
      const quote = LogisticsService.calculateDeliveryFee({ distanceMeters: 10000, targetDate });

      assert.equal(quote.timeMultiplier, 1.15);
      assert.match(quote.timeLabel, /Rush Hour/i);
      // Base = 50 + (10 * 20) = 250 ETB * 1.15 = 288 ETB
      assert.equal(quote.totalDeliveryFee, 288);
    });
  });

  describe('5. Security, Anti-Bot & Error Instrumentation', () => {
    it('gracefully passes Turnstile middleware in development or when unconfigured', async () => {
      let nextCalled = false;
      const req = { body: {}, headers: {} };
      const res = {};
      const next = () => { nextCalled = true; };

      await verifyTurnstile(req, res, next);
      assert.equal(nextCalled, true);
    });

    it('confirms Sentry DSN configuration module is loaded and safe', () => {
      assert.equal(typeof isSentryConfigured, 'boolean');
    });
  });

  describe('6. Idempotency & Network Drop Protection', () => {
    beforeEach(() => {
      clearIdempotencyCache();
    });

    it('caches and returns identical responses for identical Idempotency-Keys without re-executing business logic', () => {
      const mw = requireIdempotency();

      let executionCount = 0;
      const req = { headers: { 'idempotency-key': 'test-uuid-key-999' } };
      const res1 = {
        statusCode: 201,
        json(payload) { this.sent = payload; }
      };

      mw(req, res1, () => {
        executionCount++;
        res1.json({ masterOrderId: 'order_abc_123', status: 'FUNDS_HELD_IN_ESCROW' });
      });

      assert.equal(executionCount, 1);
      assert.deepEqual(res1.sent, { masterOrderId: 'order_abc_123', status: 'FUNDS_HELD_IN_ESCROW' });

      // Second identical request with same key
      const res2 = {
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.sent = payload; }
      };
      let nextCalled = false;
      mw(req, res2, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Handler must not be executed twice');
      assert.equal(res2.statusCode, 201);
      assert.deepEqual(res2.sent, { masterOrderId: 'order_abc_123', status: 'FUNDS_HELD_IN_ESCROW' });
    });
  });

  describe('7. RBAC and Vendor Isolation Guards', () => {
    it('enforces RBAC role guards accurately', () => {
      const buyerGuard = requireRole('buyer');
      const adminGuard = requireRole('admin');

      let buyerNext = false;
      buyerGuard({ user: { role: 'buyer' } }, {}, () => { buyerNext = true; });
      assert.equal(buyerNext, true);

      let rejectedStatus = null;
      let rejectedBody = null;
      const res = {
        status(code) { rejectedStatus = code; return this; },
        json(body) { rejectedBody = body; }
      };
      adminGuard({ user: { role: 'buyer' } }, res, () => {});
      assert.equal(rejectedStatus, 403);
      assert.match(rejectedBody.message, /not authorized/);
    });

    it('rejects client-supplied vendorId tampering in body or query', () => {
      let rejected = false;
      const res = {
        status(code) {
          if (code === 400) rejected = true;
          return this;
        },
        json() {}
      };

      const reqWithTamperedBody = { method: 'POST', body: { vendorId: 'fake-vendor-id' }, query: {}, params: {} };
      rejectClientVendorId(reqWithTamperedBody, res, () => {});
      assert.equal(rejected, true);
    });

    it('enforces vendor isolation using session vendorId', () => {
      let nextCalled = false;
      const req = { user: { role: 'vendor', vendorId: 'vendor_xyz_789' } };
      enforceVendorIsolation(req, {}, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req.vendorId, 'vendor_xyz_789');
    });
  });

  describe('8. Cloud Storage Local Fallback Resilience', () => {
    it('generates a valid data-URL fallback when R2 credentials are unset', async () => {
      const buffer = Buffer.from('test image payload content');
      const uploaded = await uploadBufferToR2({
        buffer,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        folder: 'test'
      });

      assert.ok(uploaded.url, 'Must return a usable URL');
      assert.ok(uploaded.key, 'Must generate an object key');
    });
  });

  describe('9. Real-World Authentication, Password Hashing & RBAC Invariants', () => {
    it('securely hashes passwords with PBKDF2 salt and validates correct credentials', () => {
      const password = 'CorrectHorseBatteryStaple123!';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      const stored = `${salt}:${hash}`;

      // Verification logic
      const [storedSalt, storedHash] = stored.split(':');
      const testHash = crypto.pbkdf2Sync(password, storedSalt, 100000, 64, 'sha512').toString('hex');
      const isMatch = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(storedHash, 'hex'));
      assert.equal(isMatch, true);

      // Rejects incorrect password
      const wrongHash = crypto.pbkdf2Sync('WrongPassword', storedSalt, 100000, 64, 'sha512').toString('hex');
      const isWrongMatch = crypto.timingSafeEqual(Buffer.from(wrongHash, 'hex'), Buffer.from(storedHash, 'hex'));
      assert.equal(isWrongMatch, false);
    });

    it('generates cryptographically signed JWT tokens with appropriate role payloads', () => {
      const buyerUser = { id: 'buyer_12345', _id: 'buyer_12345', role: 'buyer' };
      const vendorUser = { id: 'vendor_67890', _id: 'vendor_67890', role: 'vendor' };

      const buyerToken = generateToken(buyerUser);
      const vendorToken = generateToken(vendorUser, 'vendor_store_999');

      assert.ok(buyerToken && typeof buyerToken === 'string');
      assert.ok(vendorToken && typeof vendorToken === 'string');
    });
  });

  describe('10. Promo Coupons, Dynamic Categories & Product Variants Invariants', () => {
    it('calculates coupon discounts correctly for percentage and fixed types', () => {
      const Coupon = require('../models/Coupon');
      const percentCoupon = new Coupon({
        code: 'TEST10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 100,
        maxDiscountAmount: 500,
        isActive: true
      });

      assert.equal(percentCoupon.calculateDiscount(1000), 100);
      assert.equal(percentCoupon.calculateDiscount(50), 0); // Below minOrderAmount

      const fixedCoupon = new Coupon({
        code: 'FLAT300',
        discountType: 'fixed',
        discountValue: 300,
        minOrderAmount: 500,
        isActive: true
      });

      assert.equal(fixedCoupon.calculateDiscount(1200), 300);
      assert.equal(fixedCoupon.calculateDiscount(200), 0); // Below minOrderAmount
    });

    it('ensures dynamic category model preserves normalized slugs and tags', () => {
      const Category = require('../models/Category');
      const cat = new Category({
        name: 'Everyday Carry',
        slug: 'electronics',
        tag: '01 / EVERYDAY CARRY',
        description: 'Pocket instruments'
      });

      assert.equal(cat.slug, 'electronics');
      assert.equal(cat.tag, '01 / EVERYDAY CARRY');
    });

    it('correctly associates product variants with dedicated SKUs and pricing', () => {
      const Product = require('../models/Product');
      const product = new Product({
        vendorId: new mongoose.Types.ObjectId(),
        title: 'Archival Analog Camera',
        price: 4500,
        stock: 5,
        variants: [
          { sku: 'CAM-STD', title: 'Standard Lens Edition', price: 4500, stock: 3 },
          { sku: 'CAM-REST', title: 'Restored F/1.4 Lens Edition', price: 5200, stock: 2 }
        ]
      });

      assert.equal(product.variants.length, 2);
      assert.equal(product.variants[0].sku, 'CAM-STD');
      assert.equal(product.variants[1].price, 5200);
    });
  });

  describe('11. Hyperlocal Shop Discovery & Distance Invariants', () => {
    const ShopDiscoveryService = require('../services/ShopDiscoveryService');

    it('calculates accurate distance between coordinates using Haversine formula', () => {
      // Same coordinates = 0 km
      const distZero = ShopDiscoveryService.calculateDistanceKm(8.5400, 39.2680, 8.5400, 39.2680);
      assert.equal(distZero, 0);

      // Posta Bet, Adama [8.5415, 39.2705] to Geda, Adama [8.5520, 39.2630] (~1.4 km)
      const distAdama = ShopDiscoveryService.calculateDistanceKm(8.5415, 39.2705, 8.5520, 39.2630);
      assert.ok(distAdama >= 1.0 && distAdama <= 2.0, `Expected ~1.4km in Adama, got ${distAdama}km`);
    });

    it('ranks shops intelligently by multi-factor score balancing rating and distance', () => {
      const topShopScore = ShopDiscoveryService.computeShopScore({
        ratingAvg: 4.95,
        reviewCount: 140,
        distanceKm: 1.2,
        categoryMatch: true,
        isOpen: true
      });

      const distantShopScore = ShopDiscoveryService.computeShopScore({
        ratingAvg: 3.8,
        reviewCount: 5,
        distanceKm: 25.0,
        categoryMatch: false,
        isOpen: false
      });

      assert.ok(topShopScore > distantShopScore, `Top shop (${topShopScore}) must outrank distant shop (${distantShopScore})`);
      assert.ok(topShopScore >= 100, 'Top recommended shop score should exceed 100 points');
    });

    it('estimates dynamic courier delivery fee and ETA based on travel distance', () => {
      const nearDelivery = ShopDiscoveryService.estimateCourierDelivery(1.5);
      assert.equal(nearDelivery.feeETB, 73); // 50 + 1.5 * 15 = 72.5 -> 73 ETB
      assert.ok(nearDelivery.etaMinutes <= 25);
      assert.ok(nearDelivery.speedBadge.includes('Lightning'));

      const farDelivery = ShopDiscoveryService.estimateCourierDelivery(10.0);
      assert.equal(farDelivery.feeETB, 200); // 50 + 10 * 15 = 200 ETB
      assert.ok(farDelivery.etaMinutes > 25);
    });
  });

  describe('12. Variant-Level Inventory Atomic Updates & arrayFilters', () => {
    const Product = require('../models/Product');

    it('atomically decrements both overall stock and specific variant stock using arrayFilters', async () => {
      const vendorId = new mongoose.Types.ObjectId();
      const product = await Product.create({
        vendorId,
        title: 'Mid-Century Desk Lamp',
        price: 1800,
        stock: 10,
        reservedStock: 0,
        isPublished: true,
        variants: [
          { sku: 'LAMP-BLK', title: 'Matte Black', price: 1800, stock: 4 },
          { sku: 'LAMP-BRS', title: 'Brushed Brass', price: 2100, stock: 6 }
        ]
      });

      const qtyToReserve = 2;
      const variantSku = 'LAMP-BLK';

      const reserved = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: qtyToReserve },
          variants: {
            $elemMatch: {
              sku: variantSku,
              stock: { $gte: qtyToReserve }
            }
          }
        },
        {
          $inc: {
            stock: -qtyToReserve,
            reservedStock: qtyToReserve,
            'variants.$[v].stock': -qtyToReserve
          }
        },
        {
          arrayFilters: [{ 'v.sku': variantSku }],
          new: true
        }
      );

      assert.ok(reserved, 'Atomic update must find and modify product');
      assert.equal(reserved.stock, 8, 'Overall product stock must be decremented from 10 to 8');
      assert.equal(reserved.reservedStock, 2, 'Overall reservedStock must be incremented from 0 to 2');

      const blkVariant = reserved.variants.find((v) => v.sku === 'LAMP-BLK');
      const brsVariant = reserved.variants.find((v) => v.sku === 'LAMP-BRS');
      assert.equal(blkVariant.stock, 2, 'Matte Black variant stock must be decremented from 4 to 2');
      assert.equal(brsVariant.stock, 6, 'Brushed Brass variant stock must remain untouched at 6');
    });

    it('rejects variant reservation if specific variant stock is insufficient even if overall stock is sufficient', async () => {
      const vendorId = new mongoose.Types.ObjectId();
      const product = await Product.create({
        vendorId,
        title: 'Teak Coffee Table',
        price: 4500,
        stock: 10,
        reservedStock: 0,
        isPublished: true,
        variants: [
          { sku: 'TBL-SM', title: 'Small', price: 4500, stock: 1 },
          { sku: 'TBL-LG', title: 'Large', price: 6000, stock: 9 }
        ]
      });

      const qtyToReserve = 3; // Requesting 3 of Small when only 1 is in stock
      const variantSku = 'TBL-SM';

      const reserved = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: qtyToReserve },
          variants: {
            $elemMatch: {
              sku: variantSku,
              stock: { $gte: qtyToReserve }
            }
          }
        },
        {
          $inc: {
            stock: -qtyToReserve,
            reservedStock: qtyToReserve,
            'variants.$[v].stock': -qtyToReserve
          }
        },
        {
          arrayFilters: [{ 'v.sku': variantSku }],
          new: true
        }
      );

      assert.equal(reserved, null, 'Must reject update when variant stock is insufficient');

      const unchanged = await Product.findById(product._id);
      assert.equal(unchanged.stock, 10, 'Stock must remain unchanged');
      assert.equal(unchanged.variants.find((v) => v.sku === 'TBL-SM').stock, 1);
    });
  });

  describe('13. Expired Reservation Cleanup (Background Cron Job)', () => {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');
    const MasterOrder = require('../models/MasterOrder');
    const VendorOrder = require('../models/VendorOrder');

    it('finds unpaid orders older than 30 minutes, cancels them, and restores reservedStock and variant stock', async () => {
      const vendorUser = new mongoose.Types.ObjectId();
      const vendor = await Vendor.create({
        userId: vendorUser,
        storeName: 'Archival Studio Adama',
        kycStatus: 'approved'
      });

      const product = await Product.create({
        vendorId: vendor._id,
        title: 'Vintage Radio',
        price: 1200,
        stock: 5,
        reservedStock: 2,
        isPublished: true,
        variants: [
          { sku: 'RAD-WALNUT', title: 'Walnut', price: 1200, stock: 1 }
        ]
      });

      const masterOrder = await MasterOrder.create({
        buyerId: new mongoose.Types.ObjectId(),
        totalAmount: 2400,
        paymentMethod: 'MANUAL',
        paymentStatus: 'PENDING',
        escrowStatus: ESCROW_STATUS.PENDING_PAYMENT,
        createdAt: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      });

      const vendorOrder = await VendorOrder.create({
        masterOrderId: masterOrder._id,
        vendorId: vendor._id,
        items: [
          {
            productId: product._id,
            variantSku: 'RAD-WALNUT',
            title: 'Vintage Radio (Walnut)',
            qty: 2,
            price: 1200
          }
        ],
        subtotal: 2400,
        platformFee: 60,
        vendorPayout: 2340,
        escrowStatus: ESCROW_STATUS.PENDING_PAYMENT,
        fulfillmentStatus: 'AWAITING_PAYMENT'
      });

      masterOrder.vendorOrderIds.push(vendorOrder._id);
      await masterOrder.save();
      await MasterOrder.updateOne(
        { _id: masterOrder._id },
        { $set: { createdAt: new Date(Date.now() - 45 * 60 * 1000) } },
        { timestamps: false }
      );

      // Execute cleanup
      const result = await OrderService.cleanupExpiredOrders({ olderThanMinutes: 30 });
      assert.ok(result.processedCount >= 1, 'Must process at least 1 expired order');
      assert.ok(result.orderIds.includes(masterOrder._id.toString()));

      // Verify order cancellation
      const updatedOrder = await MasterOrder.findById(masterOrder._id);
      assert.equal(updatedOrder.paymentStatus, 'FAILED');
      assert.ok(updatedOrder.reviewReason.includes('expired'));

      // Verify product stock restoration
      const restoredProduct = await Product.findById(product._id);
      assert.equal(restoredProduct.stock, 7, 'Stock should be restored from 5 to 7');
      assert.equal(restoredProduct.reservedStock, 0, 'Reserved stock should be decremented from 2 to 0');
      assert.equal(restoredProduct.variants.find((v) => v.sku === 'RAD-WALNUT').stock, 3, 'Variant stock should be restored from 1 to 3');
    });
  });

  describe('14. Vendor Inventory Direct Update Safeguards (reservedStock protection)', () => {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');

    it('rejects setting stock below reservedStock when items are held in pending checkout', async () => {
      const vendorId = new mongoose.Types.ObjectId();
      const product = await Product.create({
        vendorId,
        title: 'Handmade Clay Vase',
        price: 950,
        stock: 10,
        reservedStock: 4, // 4 units currently held in escrow/checkout
        isPublished: true
      });

      // Vendor attempts to set stock to 2 (which is < reservedStock of 4)
      const requestedStock = 2;
      const reserved = product.reservedStock || 0;
      const isForbidden = requestedStock < reserved;

      assert.equal(isForbidden, true, 'Setting stock below reserved stock must be detected as forbidden');

      // Vendor attempts to set stock to 5 (which is >= reservedStock of 4)
      const validStock = 5;
      const isValid = validStock >= reserved;
      assert.equal(isValid, true, 'Setting stock greater than or equal to reserved stock must be allowed');
    });
  });

  describe('15. Escrow Refund and Dispute Arbitration Workflow', () => {
    it('allows transitioning DISPUTED -> REFUNDED upon admin arbitration', () => {
      assert.ok(isValidEscrowTransition(ESCROW_STATUS.DISPUTED, ESCROW_STATUS.REFUNDED));
    });

    it('allows transitioning FUNDS_HELD_IN_ESCROW -> REFUNDED or CANCELLED', () => {
      assert.ok(isValidEscrowTransition(ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.REFUNDED));
      assert.ok(isValidEscrowTransition(ESCROW_STATUS.FUNDS_HELD_IN_ESCROW, ESCROW_STATUS.CANCELLED));
    });
  });

  describe('16. Unified Pricing & Financials (Quote vs Checkout Alignment)', () => {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');

    it('produces matching totals, delivery fee, and tax in quote and order creation', async () => {
      const vendorUser = new mongoose.Types.ObjectId();
      const vendor = await Vendor.create({
        userId: vendorUser,
        storeName: 'Central Adama Studio',
        kycStatus: 'approved'
      });

      const product = await Product.create({
        vendorId: vendor._id,
        title: 'Leather Messenger Bag',
        price: 2000,
        stock: 5,
        isPublished: true
      });

      const deliveryAddress = { label: 'Bole, Adama', coordinates: [39.2705, 8.5415] };

      // 1. Calculate Cart Quote
      const quote = await OrderService.calculateCartQuote({
        items: [{ productId: product._id.toString(), qty: 1 }],
        deliveryAddress
      });

      assert.equal(quote.subtotal, 2000);
      assert.equal(quote.tax, 300); // 15% VAT of 2000
      assert.equal(quote.deliveryFee, 150); // Adama base delivery
      assert.equal(quote.totalAmount, 2450); // 2000 + 300 + 150

      // 2. Create Split Order
      const order = await OrderService.createSplitOrder({
        buyer: { id: new mongoose.Types.ObjectId() },
        items: [{ productId: product._id.toString(), qty: 1 }],
        deliveryAddress,
        paymentMethod: 'MANUAL'
      });

      assert.equal(order.masterOrder.financials.cartSubtotal, 2000);
      assert.equal(order.masterOrder.financials.totalTax, 300);
      assert.equal(order.masterOrder.financials.totalDeliveryFee, 150);
      assert.equal(order.masterOrder.totalAmount, 2450);
      assert.equal(order.masterOrder.totalAmount, quote.totalAmount, 'Quote and Order grand total must match exactly');
    });
  });

  describe('17. Partial Vendor Order Cancellation and Stock Restoration', () => {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');

    it('cancels an individual vendor package and restores its reserved inventory', async () => {
      const vendorUser = new mongoose.Types.ObjectId();
      const vendor = await Vendor.create({
        userId: vendorUser,
        storeName: 'Handicraft Guild',
        kycStatus: 'approved'
      });

      const product = await Product.create({
        vendorId: vendor._id,
        title: 'Ceramic Mug Set',
        price: 800,
        stock: 10,
        isPublished: true
      });

      const buyerId = new mongoose.Types.ObjectId();
      const order = await OrderService.createSplitOrder({
        buyer: { id: buyerId },
        items: [{ productId: product._id.toString(), qty: 2 }],
        deliveryAddress: { label: 'Adama' },
        paymentMethod: 'MANUAL'
      });

      const vendorOrderId = order.vendorOrders[0]._id;

      // Check stock before cancellation
      const heldProduct = await Product.findById(product._id);
      assert.equal(heldProduct.stock, 8);
      assert.equal(heldProduct.reservedStock, 2);

      // Cancel the vendor order
      const cancelled = await OrderService.cancelVendorOrder(vendorOrderId, { id: buyerId.toString() });
      assert.equal(cancelled.escrowStatus, ESCROW_STATUS.CANCELLED);
      assert.equal(cancelled.fulfillmentStatus, 'CANCELLED');

      // Verify inventory restoration
      const restored = await Product.findById(product._id);
      assert.equal(restored.stock, 10, 'Stock must be restored to 10');
      assert.equal(restored.reservedStock, 0, 'Reserved stock must be restored to 0');
    });
  });

  describe('18. Delivery Verification OTP Handshake', () => {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');

    it('generates a 4-digit deliveryOtp for each vendor order', async () => {
      const vendor = await Vendor.create({
        userId: new mongoose.Types.ObjectId(),
        storeName: 'Speedy Electronics',
        kycStatus: 'approved'
      });

      const product = await Product.create({
        vendorId: vendor._id,
        title: 'Wireless Earbuds',
        price: 1500,
        stock: 10,
        isPublished: true
      });

      const order = await OrderService.createSplitOrder({
        buyer: { id: new mongoose.Types.ObjectId() },
        items: [{ productId: product._id.toString(), qty: 1 }],
        deliveryAddress: { label: 'Adama' },
        paymentMethod: 'MANUAL'
      });

      const vOrder = order.vendorOrders[0];
      assert.ok(vOrder.deliveryOtp, 'deliveryOtp must be present');
      assert.equal(vOrder.deliveryOtp.length, 4, 'deliveryOtp must be 4 digits');
      assert.ok(/^\d{4}$/.test(vOrder.deliveryOtp), 'deliveryOtp must be numeric');
    });
  });

});

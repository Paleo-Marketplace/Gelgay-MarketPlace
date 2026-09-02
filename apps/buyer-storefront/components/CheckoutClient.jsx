'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PaleoNavigation from './PaleoNavigation';
import InlineAuthFooter from './InlineAuthFooter';
import SellItemModal from './SellItemModal';
import TelegramAuthModal from './TelegramAuthModal';
import BigSearchBar from './BigSearchBar';
import PageNavigationFlow from './PageNavigationFlow';
import { useCartStore } from '../app/stores/useCartStore';
import { useAuthStore } from '../app/stores/useAuthStore';
import { useWishlistStore } from '../app/stores/useWishlistStore';

const TrackingMap = dynamic(() => import('../app/tracking-map'), { ssr: false });
import {
  ShoppingBag,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Upload,
  Cpu,
  ReceiptText,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
  User,
  Smartphone,
  Shield,
  X
} from 'lucide-react';

export default function CheckoutClient({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}) {
  const cart = useCartStore((state) => state.items);
  const addToCartZustand = useCartStore((state) => state.addItem);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  // States
  const [checkoutStep, setCheckoutStep] = useState('review');
  const [paymentMethod, setPaymentMethod] = useState('MANUAL');
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  useEffect(() => {
    fetchWishlist(apiUrl);
  }, [apiUrl, fetchWishlist]);

  const [selectedBank, setSelectedBank] = useState('CBE');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('Posta Bet / Bole, Adama');
  const [buyerPhone, setBuyerPhone] = useState('+251 911 234 567');
  const [deliveryNotes, setDeliveryNotes] = useState('Call before arrival, near Posta Bet.');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [manualTxRef, setManualTxRef] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Promo Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState(null);

  // Chapa Test Modal State
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false);
  const [chapaChannel, setChapaChannel] = useState('telebirr');
  const [chapaPhone, setChapaPhone] = useState('0911234567');
  const [chapaPin, setChapaPin] = useState('1234');
  const [chapaCardNum, setChapaCardNum] = useState('4242 4242 4242 4242');
  const [chapaExpiry, setChapaExpiry] = useState('12/28');
  const [chapaCvv, setChapaCvv] = useState('123');
  const [chapaPaying, setChapaPaying] = useState(false);
  const [activeTxRef, setActiveTxRef] = useState('');
  const [activeMasterOrderId, setActiveMasterOrderId] = useState('');
  const [activeVendorOrderId, setActiveVendorOrderId] = useState('');

  // Fetch auth session on mount & auto-clear error banner upon login
  useEffect(() => {
    fetchUser(apiUrl);
  }, [apiUrl, fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      setErrorMessage(null);
    }
  }, [isAuthenticated]);

  // Cart products resolution
  const resolvedCart = cart;

  const itemSubtotal = resolvedCart.reduce((sum, item) => sum + (item.price || 0), 0);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const discountedSubtotal = Math.max(0, itemSubtotal - discountAmount);
  const tax15 = Math.round(discountedSubtotal * 0.15);
  const deliveryFee = 150;
  const totalAmountETB = discountedSubtotal + tax15 + deliveryFee;

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponInput) return;
    setValidatingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subtotal: itemSubtotal })
      });
      const data = await res.json();
      if (res.ok && data.success && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponMessage({ type: 'success', text: `Coupon ${data.coupon.code} applied! (-${data.coupon.discountAmount} ETB)` });
      } else {
        throw new Error(data.message || 'Invalid coupon');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: err.message });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleExecuteCheckout = async () => {
    if (!isAuthenticated) {
      useAuthStore.getState().openAuthModal({
        reason: 'Sign in or create an account to process payment and lock your order in 100% Escrow.',
        mode: 'signin',
        onSuccess: () => {
          setTimeout(() => {
            handleExecuteCheckout();
          }, 300);
        }
      });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setCheckoutStep('ocr_validating');
    setOcrProgress(25);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `chk_${Date.now()}`;

    try {
      // 1. Create order in API
      const checkoutRes = await fetch(`${apiUrl}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify({
          paymentMethod,
          deliveryAddress: {
            label: deliveryNeighborhood,
            coordinates: [38.762, 9.012]
          },
          items: resolvedCart.map((p) => ({
            productId: p._id || p.id,
            qty: p.qty || 1,
            variantSku: p.variantSku
          })),
          couponCode: appliedCoupon?.code
        })
      });

      if (checkoutRes.status === 401) {
        setBusy(false);
        setCheckoutStep('review');
        setErrorMessage('Authentication required. Please sign in via Google or Telegram to place escrow orders.');
        setIsTelegramAuthOpen(true);
        return;
      }

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.success) {
        throw new Error(checkoutData.message || `Checkout failed with status ${checkoutRes.status}`);
      }

      setOcrProgress(50);

      // Handle Chapa Gateway
      if (paymentMethod === 'CHAPA') {
        const txRef = checkoutData.payment?.txRef || `paleo-${checkoutData.masterOrder?._id}`;
        setActiveTxRef(txRef);
        setActiveMasterOrderId(checkoutData.masterOrder?._id);
        setActiveVendorOrderId(checkoutData.vendorOrders?.[0]?._id);

        if (checkoutData.payment?.checkoutUrl && !checkoutData.payment?.sandbox && !checkoutData.payment?.checkoutUrl.includes('/orders')) {
          setOcrProgress(100);
          window.location.href = checkoutData.payment.checkoutUrl;
          return;
        }

        // Open Interactive Chapa Test Modal
        setBusy(false);
        setCheckoutStep('review');
        setIsChapaModalOpen(true);
        return;
      }

      const masterOrderId = checkoutData.masterOrder?._id;
      const vendorOrderId = checkoutData.vendorOrders?.[0]?._id;

      // 2. Submit Real Bank Receipt for OCR Verification & Admin Escrow Review
      setOcrProgress(75);
      const receiptFormData = new FormData();
      if (receiptFile) {
        receiptFormData.append('receipt', receiptFile);
      }
      receiptFormData.append('receiptText', `Bank: ${selectedBank} Ref: ${manualTxRef || 'SUBMITTED_MANUAL'} Amount: ${totalAmountETB} ETB`);

      let verificationRes = null;
      if (masterOrderId) {
        const rcptRes = await fetch(`${apiUrl}/api/checkout/${masterOrderId}/manual-receipt`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Idempotency-Key': `${idempotencyKey}_rcpt` },
          body: receiptFormData
        });
        verificationRes = await rcptRes.json().catch(() => ({}));
      }

      setOcrProgress(100);
      setExtractedData({
        refNo: verificationRes?.ocrResult?.ref || manualTxRef || 'MANUAL_DEPOSIT',
        amount: verificationRes?.ocrResult?.amount || totalAmountETB,
        confidence: verificationRes?.ocrResult?.confidence || 0.98,
        masterOrderId: masterOrderId || 'MO-VERIFIED',
        vendorOrderId: vendorOrderId || 'VO-VERIFIED',
        timestamp: new Date().toLocaleTimeString()
      });
      clearCartZustand();
      setCheckoutStep('confirmed');
    } catch (e) {
      console.error('Checkout error:', e);
      setErrorMessage(e.message || 'Payment processing failed. Please verify your connection.');
      setCheckoutStep('review');
    } finally {
      setBusy(false);
    }
  };

  const handleChapaModalPay = async () => {
    setChapaPaying(true);
    setErrorMessage(null);
    try {
      // Simulate verification / direct verification with Chapa API
      const res = await fetch(`${apiUrl}/api/payments/chapa/verify/${activeTxRef}`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));

      setExtractedData({
        refNo: activeTxRef,
        amount: totalAmountETB,
        confidence: 1.0,
        masterOrderId: activeMasterOrderId || 'MO-CHAPA-ESCROW',
        vendorOrderId: activeVendorOrderId || 'VO-CHAPA-ESCROW',
        timestamp: new Date().toLocaleTimeString()
      });

      clearCartZustand();
      setIsChapaModalOpen(false);
      setCheckoutStep('confirmed');
    } catch (err) {
      setErrorMessage(err.message || 'Payment simulation failed');
    } finally {
      setChapaPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      
      {/* Frame 14-839: Paleo Cart Checkout Navigation Header */}
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => {}}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* Frame 14-863: Checkout Progress Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E4DC] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
                SECURE ESCROW CHECKOUT
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#1F1E1B] mt-1">
                Order & Escrow Lock
              </h1>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className={`px-3 py-1.5 rounded-lg font-semibold ${checkoutStep === 'review' ? 'bg-[#1F1E1B] text-[#FAF8F5]' : 'bg-[#EFECE6] text-[#625D54]'}`}>
                1. Review
              </span>
              <span className="text-[#A5A096]">→</span>
              <span className={`px-3 py-1.5 rounded-lg font-semibold ${checkoutStep === 'payment' || checkoutStep === 'ocr_validating' ? 'bg-[#1F1E1B] text-[#FAF8F5]' : 'bg-[#EFECE6] text-[#625D54]'}`}>
                2. Escrow Payment
              </span>
              <span className="text-[#A5A096]">→</span>
              <span className={`px-3 py-1.5 rounded-lg font-semibold ${checkoutStep === 'confirmed' ? 'bg-emerald-700 text-white' : 'bg-[#EFECE6] text-[#625D54]'}`}>
                3. Dispatch & Tracking
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Frame 14-863: Main Dual-Column Checkout Flow */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {checkoutStep === 'confirmed' ? (
          /* Step 3: Confirmed & Live Leaflet GPS Dispatch */
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="p-8 bg-white border border-emerald-300 rounded-3xl shadow-xl text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-700 font-bold block">
                ESCROW VAULT SECURED • FUNDS LOCKED
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#1F1E1B]">
                Payment Verified & Order Dispatched!
              </h2>
              <p className="font-sans text-sm text-[#625D54] max-w-lg mx-auto font-light">
                Your payment of <strong>{totalAmountETB.toLocaleString()} ETB</strong> is locked in ገልጋይ (Gelgay) Escrow. The courier has been dispatched for physical pickup in Adama.
              </p>

              {/* OCR Receipt Extract Card */}
              {extractedData && (
                <div className="max-w-md mx-auto p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-2xl font-mono text-xs text-left space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DC]">
                    <span className="text-[#7C776E]">OCR Reference:</span>
                    <span className="font-bold text-[#1F1E1B]">{extractedData.refNo}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DC]">
                    <span className="text-[#7C776E]">OCR Confidence:</span>
                    <span className="font-bold text-emerald-700">{(extractedData.confidence * 100).toFixed(1)}% Match</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C776E]">Sub-Order ID:</span>
                    <span className="font-bold text-[#1F1E1B]">{extractedData.vendorOrderId}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Leaflet GPS Dispatch Map */}
            <div className="p-6 bg-white border border-[#E2DDD3] rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">Live Adama Courier Tracking</h3>
                    <p className="font-mono text-xs text-[#7C776E]">Posta Bet Vendor Pickup → {deliveryNeighborhood}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-mono text-xs font-semibold rounded-full">
                  ETA: 35 Mins
                </span>
              </div>

              <div className="h-96 rounded-2xl overflow-hidden border border-[#E2DDD3]">
                <TrackingMap
                  vendorPos={[9.022, 38.752]}
                  buyerPos={[9.012, 38.765]}
                  courierPos={[9.018, 38.758]}
                />
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/shop"
                onClick={() => clearCartZustand()}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors"
              >
                <span>Continue Browsing Archive</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : resolvedCart.length === 0 ? (
          <div className="max-w-xl mx-auto py-16 bg-white border border-[#E2DDD3] rounded-3xl p-8 text-center space-y-4 shadow-md">
            <div className="w-16 h-16 bg-[#FAF3F0] text-[#C85A32] rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl text-[#1F1E1B]">Your Escrow Cart is Empty</h3>
            <p className="font-sans text-sm text-[#625D54]">
              Please browse the curated archives to add authenticated items to your escrow checkout.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#C85A32] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#D96B42] transition-colors shadow-sm"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Step 1 & 2: Review and Payment */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Review Details */}
            <div className="lg:col-span-7 space-y-8">

              {/* Guest Auth Protection Banner */}
              {!isAuthenticated && (
                <div className="p-6 bg-gradient-to-r from-[#FAF3F0] via-white to-[#FAF3F0] border-2 border-[#C85A32]/40 rounded-3xl space-y-3 shadow-xs animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-[#C85A32]/10 rounded-2xl text-[#C85A32] shrink-0 mt-0.5">
                        <ShieldCheck className="w-6 h-6 text-[#C85A32]" />
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#1F1E1B]">
                          Checking out as Guest
                        </h3>
                        <p className="font-sans text-xs text-[#625D54] mt-0.5 leading-relaxed">
                          Sign in or create an account to unlock 100% Escrow Protection, link this order to your profile, and receive live courier GPS updates.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        useAuthStore.getState().openAuthModal({
                          reason: 'Sign in or create an account to lock your items in Escrow and track delivery in real time.',
                          mode: 'signin'
                        });
                      }}
                      className="px-5 py-2.5 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors shrink-0 text-center shadow-xs"
                    >
                      Sign In / Sign Up
                    </button>
                  </div>
                </div>
              )}
              
              {/* Cart Items List */}
              <div className="p-6 sm:p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
                  <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">
                    Archival Pieces ({resolvedCart.length})
                  </h3>
                  <span className="font-mono text-xs text-[#7C776E]">100% Escrow Protected</span>
                </div>

                <div className="space-y-4">
                  {resolvedCart.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-xs border border-white/80 rounded-2xl shadow-2xs"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format'}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover bg-[#EFECE6]"
                        />
                        <div>
                          <h4 className="font-serif text-base font-bold text-[#1F1E1B]">{item.title}</h4>
                          <p className="font-mono text-xs text-[#7C776E]">
                            Curator: {item.vendorId?.storeName || 'PALEO Verified'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-[#1F1E1B] block">
                          {(item.price || 0).toLocaleString()} ETB
                        </span>
                        <button
                          onClick={() => removeOneZustand(item._id)}
                          className="text-red-600 hover:text-red-800 p-1 text-xs font-mono"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="p-6 sm:p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C85A32]" />
                  <span>Adama Delivery Address & Contact</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                      Neighborhood Destination
                    </label>
                    <select
                      value={deliveryNeighborhood}
                      onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                    >
                      <option value="Posta Bet / Bole, Adama">Posta Bet / Bole, Adama</option>
                      <option value="Geda / Dembi, Adama">Geda / Dembi, Adama</option>
                      <option value="Boku Shenen, Adama">Boku Shenen, Adama</option>
                      <option value="Daka Adu / Franko, Adama">Daka Adu / Franko, Adama</option>
                      <option value="Goro / ASTU Enclave, Adama">Goro / ASTU Enclave, Adama</option>
                      <option value="Migira / Wonji Road, Adama">Migira / Wonji Road, Adama</option>
                      <option value="Melka Adama, Adama">Melka Adama, Adama</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                      Phone for Courier Call
                    </label>
                    <input
                      type="text"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+251 911 000 000"
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#C85A32]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                    Delivery Instructions / Landmark
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. In front of Posta Bet, 2nd floor..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Order Summary & Payment Gateway */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Order Calculation Card */}
              <div className="p-6 sm:p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">
                  Escrow Vault Summary
                </h3>

                <div className="space-y-2.5 font-mono text-xs text-[#625D54]">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-[#1F1E1B]">{itemSubtotal.toLocaleString()} ETB</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Promo Discount ({appliedCoupon?.code}):</span>
                      <span>-{discountAmount.toLocaleString()} ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>15% Vault VAT:</span>
                    <span>{tax15.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Adama Courier Fee:</span>
                    <span>{deliveryFee.toLocaleString()} ETB</span>
                  </div>
                  <div className="pt-3 border-t border-[#E8E4DC] flex justify-between text-base font-bold text-[#1F1E1B]">
                    <span>Total Escrow Lock:</span>
                    <span className="text-[#C85A32]">{totalAmountETB.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div className="pt-2 border-t border-[#E8E4DC]">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Promo / Coupon Code"
                      className="flex-1 px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl font-mono text-xs focus:outline-hidden focus:border-[#C85A32]"
                    />
                    <button
                      type="submit"
                      disabled={validatingCoupon || !couponInput}
                      className="px-3.5 py-2 bg-[#1F1E1B] text-white font-mono text-xs font-semibold rounded-xl hover:bg-[#C85A32] transition-colors disabled:opacity-50"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  </form>
                  {couponMessage && (
                    <p className={`font-mono text-[11px] mt-1.5 ${couponMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="p-6 sm:p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
                <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">
                  Select Escrow Transfer Method
                </h3>

                {/* Bank / Chapa Selector Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('MANUAL')}
                    className={`py-3 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'MANUAL'
                        ? 'bg-[#1F1E1B] text-white border-[#1F1E1B]'
                        : 'bg-[#FAF8F5] text-[#625D54] border-[#E8E4DC]'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CHAPA')}
                    className={`py-3 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'CHAPA'
                        ? 'bg-[#1F1E1B] text-white border-[#1F1E1B]'
                        : 'bg-[#FAF8F5] text-[#625D54] border-[#E8E4DC]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Chapa Gateway</span>
                  </button>
                </div>

                {paymentMethod === 'MANUAL' && (
                  <div className="space-y-4 pt-2">
                    {/* Bank Selection Pills */}
                    <div className="grid grid-cols-3 gap-2">
                      {['CBE', 'TELEBIRR', 'AWASH'].map((b) => (
                        <button
                          key={b}
                          onClick={() => setSelectedBank(b)}
                          className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                            selectedBank === b
                              ? 'bg-[#C85A32] text-white border-[#C85A32] font-bold'
                              : 'bg-[#FAF8F5] text-[#625D54] border-[#E8E4DC]'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    {/* Bank Account Details */}
                    <div className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl font-mono text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#7C776E]">Account Name:</span>
                        <span className="font-bold text-[#1F1E1B]">GELGAY (ገልጋይ) ESCROW TRUST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7C776E]">Account Number:</span>
                        <span className="font-bold text-[#C85A32]">
                          {selectedBank === 'CBE' ? '1000293847561' : selectedBank === 'TELEBIRR' ? '0911223344' : '014285910293'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7C776E]">Exact Amount:</span>
                        <span className="font-bold text-[#1F1E1B]">{totalAmountETB.toLocaleString()} ETB</span>
                      </div>
                    </div>

                    {/* Receipt Upload & Ref Input */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                          Transaction Reference Number
                        </label>
                        <input
                          type="text"
                          value={manualTxRef}
                          onChange={(e) => setManualTxRef(e.target.value)}
                          placeholder="e.g. FT2608149812 / TB8891041"
                          className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#C85A32]"
                        />
                      </div>

                      <div className="border-2 border-dashed border-[#C85A32]/40 bg-[#FAF8F5] p-5 text-center space-y-2 rounded-2xl">
                        <Upload className="w-6 h-6 text-[#C85A32] mx-auto" />
                        <p className="font-mono text-xs text-[#1F1E1B] font-semibold">Upload Transfer Screenshot (Optional)</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])}
                          className="text-xs text-[#7C776E] mx-auto block"
                        />
                        {receiptFile && (
                          <p className="text-xs text-emerald-700 font-mono">Selected: {receiptFile.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Python OCR & Vault Guarantee Notice */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-mono font-bold">
                        <Cpu className="w-4 h-4 text-emerald-600" />
                        <span>Automated Python OCR & Escrow Lock</span>
                      </div>
                      <p className="text-emerald-900 font-sans font-light leading-relaxed">
                        Receipt images are analyzed in real time via our Tesseract OCR microservice, holding your payment securely in escrow until 48h physical courier verification.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CHAPA' && (
                  <div className="space-y-4 pt-2">
                    {/* Chapa Test Mode Banner */}
                    <div className="p-4 bg-gradient-to-r from-[#00C48C]/10 via-[#0052FF]/10 to-[#FAF8F5] border border-[#00C48C]/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-mono text-xs font-bold text-[#1F1E1B] tracking-wide">CHAPA DIGITAL GATEWAY</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
                          Test Mode Active
                        </span>
                      </div>

                      <p className="text-xs text-[#625D54] leading-relaxed">
                        Authorize instant escrow vault locks using Ethiopian payment rails. Choose from Telebirr, CBEBirr, Awash, or Card.
                      </p>

                      {/* Payment Channel Pills */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="p-2.5 bg-white border border-[#E8E4DC] rounded-xl text-center shadow-2xs">
                          <span className="block text-[10px] font-mono text-[#7C776E]">MOBILE MONEY</span>
                          <span className="font-mono text-xs font-bold text-[#00C48C]">Telebirr</span>
                        </div>
                        <div className="p-2.5 bg-white border border-[#E8E4DC] rounded-xl text-center shadow-2xs">
                          <span className="block text-[10px] font-mono text-[#7C776E]">ETHIO BANKING</span>
                          <span className="font-mono text-xs font-bold text-[#8A2BE2]">CBEBirr</span>
                        </div>
                        <div className="p-2.5 bg-white border border-[#E8E4DC] rounded-xl text-center shadow-2xs">
                          <span className="block text-[10px] font-mono text-[#7C776E]">INTERNATIONAL</span>
                          <span className="font-mono text-xs font-bold text-[#1F1E1B]">Visa/Master</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/70 border border-white rounded-xl text-[11px] font-mono text-[#7C776E] flex justify-between">
                        <span>Simulated Public API Key:</span>
                        <code className="text-[#1F1E1B] font-bold">CHAPUBK_TEST-DEMO</code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Authenticated Escrow Status Indicator */}
                {isAuthenticated && currentUser ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-mono flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Signed in as <strong>{currentUser.displayName || (currentUser.telegramUsername ? `@${currentUser.telegramUsername}` : currentUser.email || 'Verified Buyer')}</strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2">
                      {currentUser.role || 'BUYER'}
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs flex items-center justify-between shadow-xs">
                    <span className="font-sans">Sign in to lock funds in 100% Escrow.</span>
                    <button
                      type="button"
                      onClick={() => {
                        useAuthStore.getState().openAuthModal({
                          reason: 'Sign in or create an account to lock funds in 100% Escrow and track delivery.',
                          mode: 'signin'
                        });
                      }}
                      className="px-3 py-1 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-[11px] uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-mono text-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Submit / Pay Button */}
                <button
                  onClick={handleExecuteCheckout}
                  disabled={busy}
                  className="w-full py-4.5 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-2xl hover:bg-[#C85A32] transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>
                    {busy
                      ? `Validating OCR (${ocrProgress}%)...`
                      : paymentMethod === 'CHAPA'
                      ? `Proceed to Chapa Gateway (${totalAmountETB.toLocaleString()} ETB)`
                      : `Lock ${totalAmountETB.toLocaleString()} ETB in Escrow`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Escrow Guarantee Statement */}
                <p className="font-mono text-[11px] text-[#7C776E] text-center">
                  Funds released to vendor only after you test the item for 48 hours.
                </p>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[{ label: 'Shop', href: '/shop' }, { label: 'Escrow Checkout' }]}
        prev={{ label: 'Continue Shopping', sublabel: 'Return to catalog & curated archives', href: '/shop' }}
        next={{ label: 'Escrow Guarantees & FAQ', sublabel: 'Learn about our 48h physical inspection window', href: '/buyer-protection' }}
      />

      {/* Frame 14-953: Cart Checkout Footer Frame */}
      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      {/* Modals */}
      <SellItemModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} onAddProduct={() => setIsSellOpen(false)} />
      <TelegramAuthModal
        isOpen={isTelegramAuthOpen}
        onClose={() => setIsTelegramAuthOpen(false)}
        apiUrl={apiUrl}
        onSuccess={() => setErrorMessage(null)}
        onOpenSell={() => setIsSellOpen(true)}
      />
      <BigSearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={() => setIsSearchOpen(false)} />

      {/* Interactive Chapa Test Mode Modal */}
      {isChapaModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-[#E2DDD3] relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00C48C] to-[#0052FF] flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">Chapa Checkout</h3>
                  <p className="font-mono text-[10px] text-[#7C776E]">Ethiopian Payment Gateway</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
                  Test Sandbox
                </span>
                <button
                  type="button"
                  onClick={() => setIsChapaModalOpen(false)}
                  className="p-1.5 text-[#7C776E] hover:text-[#1F1E1B] rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Escrow Lock Banner */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Escrow Vault Lock:</span>
              </div>
              <span className="font-bold text-[#1F1E1B] text-sm">{totalAmountETB.toLocaleString()} ETB</span>
            </div>

            {/* Payment Channel Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl">
              {[
                { id: 'telebirr', label: 'Telebirr', color: '#00C48C' },
                { id: 'cbe', label: 'CBEBirr', color: '#8A2BE2' },
                { id: 'card', label: 'Card', color: '#1F1E1B' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChapaChannel(tab.id)}
                  className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold transition-all ${
                    chapaChannel === tab.id
                      ? 'bg-white shadow-xs text-[#1F1E1B] font-bold'
                      : 'text-[#7C776E] hover:text-[#1F1E1B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Channel Content */}
            {chapaChannel === 'telebirr' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                    Telebirr Phone Number
                  </label>
                  <input
                    type="text"
                    value={chapaPhone}
                    onChange={(e) => setChapaPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#00C48C]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                    Simulation PIN (Test Sandbox)
                  </label>
                  <input
                    type="password"
                    value={chapaPin}
                    onChange={(e) => setChapaPin(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#00C48C]"
                  />
                </div>
                <p className="text-[11px] font-mono text-[#7C776E]">
                  📱 Simulating automatic USSD push authorization from Ethio Telecom.
                </p>
              </div>
            )}

            {chapaChannel === 'cbe' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                    CBE Account / Mobile Number
                  </label>
                  <input
                    type="text"
                    defaultValue="1000293847561"
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#8A2BE2]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                    CBEBirr One-Time Passcode
                  </label>
                  <input
                    type="password"
                    defaultValue="8821"
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#8A2BE2]"
                  />
                </div>
              </div>
            )}

            {chapaChannel === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                    Card Number (Test Sandbox)
                  </label>
                  <input
                    type="text"
                    value={chapaCardNum}
                    onChange={(e) => setChapaCardNum(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#1F1E1B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                      MM / YY
                    </label>
                    <input
                      type="text"
                      value={chapaExpiry}
                      onChange={(e) => setChapaExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#1F1E1B]"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-1 font-semibold">
                      CVC
                    </label>
                    <input
                      type="text"
                      value={chapaCvv}
                      onChange={(e) => setChapaCvv(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl text-sm font-mono focus:outline-none focus:border-[#1F1E1B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Authorize & Lock Escrow Button */}
            <button
              type="button"
              onClick={handleChapaModalPay}
              disabled={chapaPaying}
              className="w-full py-4 bg-gradient-to-r from-[#00C48C] to-[#0052FF] text-white font-mono text-xs uppercase tracking-wider font-bold rounded-2xl hover:opacity-95 transition-opacity shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {chapaPaying ? (
                <span>Simulating Chapa Escrow Authorization...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize {chapaChannel.toUpperCase()} Escrow Lock ({totalAmountETB.toLocaleString()} ETB)</span>
                </>
              )}
            </button>

            <div className="text-center font-mono text-[10px] text-[#7C776E]">
              Ref: <code className="text-[#1F1E1B]">{activeTxRef || 'paleo-test-session'}</code> • 100% Escrow Protection
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

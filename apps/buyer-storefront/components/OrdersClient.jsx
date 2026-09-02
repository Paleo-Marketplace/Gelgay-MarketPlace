'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PaleoNavigation from './PaleoNavigation';
import InlineAuthFooter from './InlineAuthFooter';
import CartDrawer from './CartDrawer';
import SellItemModal from './SellItemModal';
import TelegramAuthModal from './TelegramAuthModal';
import BigSearchBar from './BigSearchBar';
import PageNavigationFlow from './PageNavigationFlow';
import NotificationDrawer from './NotificationDrawer';
import ReviewModal from './ReviewModal';
import { useCartStore } from '../app/stores/useCartStore';
import { useAuthStore } from '../app/stores/useAuthStore';
import { useWishlistStore } from '../app/stores/useWishlistStore';
import {
  ShoppingBag,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  ArrowRight,
  RefreshCw,
  Eye,
  Package,
  Sparkles,
  ExternalLink,
  Star
} from 'lucide-react';

const TrackingMap = dynamic(() => import('../app/tracking-map'), { ssr: false });

export default function OrdersClient({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}) {
  const cart = useCartStore((state) => state.items);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  useEffect(() => {
    fetchWishlist(apiUrl);
  }, [apiUrl, fetchWishlist]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [busyOrderId, setBusyOrderId] = useState(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/orders`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.masterOrders)) {
          setOrders(data.masterOrders);
          if (data.masterOrders.length > 0 && !selectedOrder) {
            setSelectedOrder(data.masterOrders[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser(apiUrl).then(() => {
      loadOrders();
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const txRef = params.get('tx_ref') || params.get('trx_ref');
      const status = params.get('status');
      if (txRef && (status === 'success' || status === 'successful' || !status)) {
        fetch(`${apiUrl}/api/payments/chapa/verify/${txRef}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.paid) {
              setActionStatus({
                type: 'success',
                message: 'Chapa transaction verified! 100% of your funds are secured in the ገልጋይ (Gelgay) Escrow Vault.'
              });
              loadOrders();
            }
          })
          .catch(() => {});
      }
    }
  }, [apiUrl, fetchUser]);

  const confirmDelivery = async (vendorOrderId) => {
    setBusyOrderId(vendorOrderId);
    setActionStatus(null);
    try {
      const res = await fetch(`${apiUrl}/api/orders/vendor-orders/${vendorOrderId}/confirm-delivery`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionStatus({ type: 'success', message: 'Delivery confirmed! 48-hour inspection window active.' });
        await loadOrders();
      } else {
        throw new Error(data.message || 'Failed to confirm delivery');
      }
    } catch (err) {
      setActionStatus({ type: 'error', message: err.message });
    } finally {
      setBusyOrderId(null);
    }
  };

  const reportDispute = async (vendorOrderId) => {
    if (!confirm('Are you sure you want to dispute this delivery? Our admin escrow arbitration team will review your report.')) return;
    setBusyOrderId(vendorOrderId);
    setActionStatus(null);
    try {
      const res = await fetch(`${apiUrl}/api/escrow/vendor-orders/${vendorOrderId}/dispute`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionStatus({ type: 'warning', message: 'Dispute submitted. Escrow payout has been frozen pending arbitration.' });
        await loadOrders();
      } else {
        throw new Error(data.message || 'Failed to file dispute');
      }
    } catch (err) {
      setActionStatus({ type: 'error', message: err.message });
    } finally {
      setBusyOrderId(null);
    }
  };

  const getEscrowBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Payment Pending', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'FUNDS_HELD_IN_ESCROW':
        return { label: 'Funds Held in Escrow', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'DISPATCHED':
        return { label: 'Dispatched with Courier', bg: 'bg-sky-100 text-sky-900 border-sky-300' };
      case 'DELIVERED':
        return { label: 'Delivered (48h Inspection)', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'FUNDS_RELEASED':
        return { label: 'Completed & Released', bg: 'bg-emerald-800 text-emerald-100 border-emerald-900' };
      case 'DISPUTED':
        return { label: 'Dispute in Arbitration', bg: 'bg-red-100 text-red-900 border-red-300' };
      default:
        return { label: status || 'Pending', bg: 'bg-stone-100 text-stone-900 border-stone-300' };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E4DC] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF3F0] border border-[#C85A32]/20 rounded-full text-xs font-mono text-[#C85A32] mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>100% ESCROW BUYER HUB</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1B]">
                Order Tracking & Escrow Ledger
              </h1>
              <p className="font-sans text-sm text-[#625D54] mt-2 font-light max-w-xl">
                Track live courier dispatch across Adama, inspect active escrow vault holds, and confirm 48h physical delivery.
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl font-mono text-xs font-semibold hover:border-[#C85A32] transition-colors self-start md:self-auto shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {actionStatus && (
          <div className={`p-4 mb-8 rounded-2xl font-mono text-xs border flex items-center gap-3 ${
            actionStatus.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            actionStatus.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
            'bg-red-50 border-red-300 text-red-900'
          }`}>
            {actionStatus.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {actionStatus.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            <span>{actionStatus.message}</span>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="p-12 bg-white border border-[#E2DDD3] rounded-3xl text-center max-w-xl mx-auto space-y-5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-[#FAF3F0] text-[#C85A32] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1F1E1B]">
              Sign in to view your orders
            </h2>
            <p className="font-sans text-sm text-[#625D54] font-light">
              Authenticate via Google OAuth or Telegram Bot to view your active escrow dispatches and order history.
            </p>
            <button
              onClick={() => setIsTelegramAuthOpen(true)}
              className="px-6 py-3.5 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors shadow-sm"
            >
              Sign In to ገልጋይ (Gelgay)
            </button>
          </div>
        ) : orders.length === 0 && !loading ? (
          <div className="p-12 bg-white border border-[#E2DDD3] rounded-3xl text-center max-w-xl mx-auto space-y-5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] text-[#7C776E] flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1F1E1B]">
              No orders placed yet
            </h2>
            <p className="font-sans text-sm text-[#625D54] font-light">
              Explore our curated marketplace archives to discover authenticated vintage objects with 100% escrow protection.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#C85A32] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#D96B42] transition-colors shadow-sm"
            >
              <span>Explore Curated Archive</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Orders List */}
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] block font-semibold">
                Your Orders ({orders.length})
              </span>

              <div className="space-y-3">
                {orders.map((mo) => {
                  const isSelected = selectedOrder?._id === mo._id;
                  const firstSubOrder = mo.vendorOrderIds?.[0];
                  const badge = getEscrowBadge(firstSubOrder?.escrowStatus || mo.escrowStatus);

                  return (
                    <div
                      key={mo._id}
                      onClick={() => setSelectedOrder(mo)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#C85A32] shadow-md ring-1 ring-[#C85A32]'
                          : 'bg-white/80 border-[#E2DDD3] hover:border-[#1F1E1B] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DC]">
                        <span className="font-mono text-xs font-bold text-[#1F1E1B]">
                          #{mo._id.slice(-8).toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-[#7C776E]">
                          {new Date(mo.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="font-serif text-base font-bold text-[#1F1E1B]">
                            {mo.totalAmount.toLocaleString()} ETB
                          </p>
                          <p className="font-sans text-xs text-[#625D54]">
                            {mo.deliveryAddress?.label || 'Adama Delivery'}
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border font-semibold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Order Detail & Live Tracking */}
            <div className="lg:col-span-7">
              {selectedOrder ? (
                <div className="bg-white border border-[#E2DDD3] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                  
                  {/* Order Overview Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E8E4DC] gap-3">
                    <div>
                      <span className="font-mono text-[11px] text-[#7C776E] uppercase tracking-wider block font-semibold">
                        MASTER ORDER DETAILS
                      </span>
                      <h3 className="font-serif text-2xl font-bold text-[#1F1E1B] mt-0.5">
                        #{selectedOrder._id}
                      </h3>
                      <p className="font-mono text-xs text-[#625D54] mt-1">
                        Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-serif text-2xl font-bold text-[#C85A32] block">
                        {selectedOrder.totalAmount.toLocaleString()} ETB
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                        🔒 100% ESCROW PROTECTED
                      </span>
                    </div>
                  </div>

                  {/* Vendor Sub-Orders Breakdown */}
                  <div className="space-y-4">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] block font-semibold">
                      Vendor Sub-Orders & Handoffs:
                    </span>

                    {selectedOrder.vendorOrderIds?.map((subOrder) => {
                      const badge = getEscrowBadge(subOrder.escrowStatus);
                      const isBusy = busyOrderId === subOrder._id;

                      return (
                        <div key={subOrder._id} className="p-4 bg-[#FAF8F5] border border-[#E8E4DC] rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <strong className="font-mono text-xs text-[#1F1E1B] block">
                                Sub-Order #{subOrder._id.slice(-8).toUpperCase()}
                              </strong>
                              <span className="font-sans text-xs text-[#625D54]">
                                Payout Amount: {subOrder.vendorPayout?.toLocaleString()} ETB
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border font-semibold ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Action Buttons based on state */}
                          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#E8E4DC]">
                            <Link
                              href={`/track?q=${selectedOrder._id}`}
                              className="px-3.5 py-2 bg-[#1F1E1B] text-white font-mono text-xs rounded-xl hover:bg-[#C85A32] transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <Truck className="w-3.5 h-3.5 text-[#C85A32]" />
                              <span>Live Courier Tracking Portal</span>
                            </Link>

                            {subOrder.escrowStatus === 'DISPATCHED' && (
                              <button
                                onClick={() => confirmDelivery(subOrder._id)}
                                disabled={isBusy}
                                className="px-4 py-2 bg-emerald-700 text-white font-mono text-xs rounded-xl hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isBusy ? 'Confirming...' : 'Confirm Delivery Received'}</span>
                              </button>
                            )}

                            {(subOrder.escrowStatus === 'DISPATCHED' || subOrder.escrowStatus === 'DELIVERED') && (
                              <button
                                onClick={() => reportDispute(subOrder._id)}
                                disabled={isBusy}
                                className="px-3.5 py-2 bg-red-50 text-red-700 border border-red-200 font-mono text-xs rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Report Item Defect / Dispute</span>
                              </button>
                            )}

                            {subOrder.escrowStatus === 'FUNDS_HELD_IN_ESCROW' && (
                              <p className="text-xs font-mono text-emerald-800 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Funds secured in vault. Waiting for merchant physical dispatch.</span>
                              </p>
                            )}

                            {subOrder.escrowStatus === 'FUNDS_RELEASED' && (
                              <p className="text-xs font-mono text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Order completed successfully. Vendor payout disbursed.</span>
                              </p>
                            )}

                            {(subOrder.escrowStatus === 'DELIVERED' || subOrder.escrowStatus === 'FUNDS_RELEASED') && (
                              <button
                                onClick={() => setReviewModalProduct({
                                  id: subOrder.items?.[0]?.productId?._id || subOrder.items?.[0]?.productId || subOrder._id,
                                  title: subOrder.items?.[0]?.title || `Item #${subOrder._id.slice(-6)}`,
                                  vendorName: typeof subOrder.vendorId === 'object' && subOrder.vendorId?.storeName ? subOrder.vendorId.storeName : 'Verified Curator'
                                })}
                                className="px-3.5 py-2 bg-amber-500 text-white font-mono text-xs rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <Star className="w-3.5 h-3.5 fill-white" />
                                <span>Rate Experience & Review</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Dispatch Tracking Map */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-[#1F1E1B] font-bold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#C85A32]" />
                        <span>Live Courier GPS Dispatch Map</span>
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                        Real-time Socket.io Active
                      </span>
                    </div>

                    <TrackingMap
                      apiUrl={apiUrl}
                      masterOrderId={selectedOrder._id}
                      vendorOrderId={selectedOrder.vendorOrderIds?.[0]?._id}
                      buyerCoords={selectedOrder.deliveryAddress?.coordinates || [38.762, 9.012]}
                      vendorCoords={[38.75, 9.06]}
                    />
                  </div>

                </div>
              ) : null}
            </div>

          </div>
        )}

      </div>

      <PageNavigationFlow
        breadcrumbs={[{ label: 'Shop', href: '/shop' }, { label: 'Order Tracking Hub' }]}
        prev={{ label: 'Continue Shopping', sublabel: 'Explore curated archives & pieces', href: '/shop' }}
        next={{ label: 'Buyer Protection Protocols', sublabel: 'Learn about our 48h physical inspection window', href: '/buyer-protection' }}
      />

      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartProducts={[]}
        onRemoveFromCart={(id) => removeOneZustand(id)}
        onClearCart={clearCartZustand}
      />
      <SellItemModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} onAddProduct={() => setIsSellOpen(false)} />
      <TelegramAuthModal isOpen={isTelegramAuthOpen} onClose={() => setIsTelegramAuthOpen(false)} apiUrl={apiUrl} />
      <BigSearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={() => setIsSearchOpen(false)} />
      
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        apiUrl={apiUrl}
      />

      {reviewModalProduct && (
        <ReviewModal
          isOpen={Boolean(reviewModalProduct)}
          onClose={() => setReviewModalProduct(null)}
          productId={reviewModalProduct.id}
          productTitle={reviewModalProduct.title}
          vendorName={reviewModalProduct.vendorName}
          apiUrl={apiUrl}
        />
      )}

    </div>
  );
}

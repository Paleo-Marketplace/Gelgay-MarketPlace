'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Navigation,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const TrackingMap = dynamic(() => import('../tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full bg-[#EAE6DF] rounded-2xl flex items-center justify-center font-mono text-xs text-[#7C776E] animate-pulse">
      Loading Live GPS Map...
    </div>
  )
});

export default function TrackingPortalClient({ apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('tracking') || searchParams.get('id') || '';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeTracking, setActiveTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTracking = async (query) => {
    if (!query || !query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tracking/${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (data.success && data.shipment) {
        setActiveTracking(data);
      } else {
        setError(data.message || `No active shipment found matching "${query}".`);
        setActiveTracking(null);
      }
    } catch (err) {
      setError('Unable to connect to ገልጋይ tracking servers. Please check your connection.');
      setActiveTracking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      fetchTracking(initialQuery);
    } else {
      // Auto-load sample tracking demo if no query given
      fetchTracking('PALEO-TRK-7741');
    }
  }, [initialQuery]);

  // Periodic polling for live status if on OUT_FOR_DELIVERY or IN_TRANSIT
  useEffect(() => {
    if (!autoRefresh || !activeTracking?.shipment?.trackingNumber) return;

    const interval = setInterval(() => {
      if (activeTracking.shipment.status !== 'DELIVERED') {
        fetchTracking(activeTracking.shipment.trackingNumber);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeTracking?.shipment?.trackingNumber]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchTracking(searchInput.trim());
    }
  };

  const handleCopy = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shipment = activeTracking?.shipment;
  const order = activeTracking?.order;
  const currentStep = shipment?.currentStep || 1;

  const STEPS = [
    { key: 'CONFIRMED', label: 'Order Confirmed', sub: 'Escrow Secured' },
    { key: 'PROCESSING', label: 'Studio Packing', sub: 'Quality Inspected' },
    { key: 'IN_TRANSIT', label: 'In Transit', sub: 'ገልጋይ Sorting Hub' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', sub: 'Courier En Route' },
    { key: 'DELIVERED', label: 'Delivered', sub: '48h Inspection Window' }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Breadcrumb & Title */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#7C776E]">
            <Link href="/" className="hover:text-[#1F1E1B] transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/orders" className="hover:text-[#1F1E1B] transition-colors">Orders</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#C85A32] font-semibold">Live Courier & Shipment Portal</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1F1E1B]">
                Shipment & Escrow Tracking
              </h1>
              <p className="font-sans text-sm text-[#625D54] mt-1">
                Real-time chain of custody from artisan studio to your doorstep in Addis Ababa.
              </p>
            </div>

            <button
              onClick={() => shipment && fetchTracking(shipment.trackingNumber)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E2DDD3] rounded-xl hover:border-[#1F1E1B] transition-colors text-xs font-mono text-[#1F1E1B] self-start sm:self-auto shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C85A32]' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* Universal Search Bar */}
        <div className="p-4 sm:p-5 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C776E]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Order ID (e.g. ORD-10293) or Tracking Number (e.g. PALEO-TRK-7741)..."
                className="w-full pl-11 pr-4 py-3 bg-[#FAF8F5] border border-[#E2DDD3] rounded-2xl text-sm font-mono focus:outline-hidden focus:border-[#C85A32] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#1F1E1B] text-white rounded-2xl hover:bg-[#C85A32] transition-colors font-mono text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              <Truck className="w-4 h-4" />
              <span>Track Shipment</span>
            </button>
          </form>

          {/* Quick Demo Pre-fill Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-[#7C776E] pt-1 border-t border-[#E8E4DC]">
            <span className="text-[11px]">Quick Samples:</span>
            <button
              type="button"
              onClick={() => {
                setSearchInput('PALEO-TRK-7741');
                fetchTracking('PALEO-TRK-7741');
              }}
              className="px-2.5 py-1 bg-[#FAF3F0] text-[#C85A32] border border-[#C85A32]/30 rounded-lg hover:bg-[#C85A32] hover:text-white transition-colors"
            >
              PALEO-TRK-7741 (Out for Delivery)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchInput('ORD-10293');
                fetchTracking('ORD-10293');
              }}
              className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E2DDD3] rounded-lg hover:border-[#1F1E1B] text-[#1F1E1B] transition-colors"
            >
              ORD-10293 (Order ID Lookup)
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-800 font-sans">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Tracking Details View */}
        {shipment && (
          <div className="space-y-6 animate-fade-in">

            {/* 1. Top Status Banner Card */}
            <div className="p-6 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E8E4DC]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-[#7C776E]">TRACKING NUMBER:</span>
                    <span className="font-mono text-sm font-bold text-[#1F1E1B]">{shipment.trackingNumber}</span>
                    <button
                      onClick={() => handleCopy(shipment.trackingNumber)}
                      className="p-1 rounded-md hover:bg-[#FAF8F5] text-[#7C776E] transition-colors"
                      title="Copy tracking number"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="font-serif text-2xl font-bold text-[#1F1E1B] flex items-center gap-2.5">
                    {shipment.status === 'OUT_FOR_DELIVERY' && <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping inline-block" />}
                    {shipment.status === 'DELIVERED' && <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />}
                    {shipment.status === 'IN_TRANSIT' && <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />}
                    {shipment.status.replace(/_/g, ' ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:self-end">
                  <div className="px-3.5 py-1.5 bg-[#FAF3F0] border border-[#C85A32]/30 rounded-xl font-mono text-xs text-[#C85A32] font-semibold flex items-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    <span>{shipment.carrier}</span>
                  </div>
                </div>
              </div>

              {/* 5-Step Visual Progress Stepper */}
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {STEPS.map((step, idx) => {
                    const stepNumber = idx + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                      <div key={step.key} className="space-y-2 text-center">
                        <div className={`h-2 rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-emerald-600'
                            : isCurrent
                            ? 'bg-[#C85A32] animate-pulse'
                            : 'bg-[#EAE6DF]'
                        }`} />
                        <div>
                          <p className={`font-mono text-[11px] font-semibold truncate ${
                            isCurrent ? 'text-[#C85A32]' : isCompleted ? 'text-[#1F1E1B]' : 'text-[#A5A096]'
                          }`}>
                            {step.label}
                          </p>
                          <p className="font-mono text-[9px] text-[#7C776E] hidden sm:block truncate">
                            {step.sub}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E8E4DC] text-xs font-mono">
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E2DDD3]/60 space-y-1">
                  <span className="text-[#7C776E] text-[10px] block">ESTIMATED DELIVERY</span>
                  <p className="font-bold text-[#1F1E1B]">
                    {new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })} · ~{new Date(shipment.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E2DDD3]/60 space-y-1">
                  <span className="text-[#7C776E] text-[10px] block">CURRENT LOCATION</span>
                  <p className="font-bold text-[#1F1E1B] truncate">
                    {shipment.currentLocation?.label || 'Addis Ababa Hub'}
                  </p>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E2DDD3]/60 space-y-1">
                  <span className="text-[#7C776E] text-[10px] block">SERVICE LEVEL</span>
                  <p className="font-bold text-[#C85A32] truncate">
                    {shipment.serviceLevel}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Driver & Courier Contact Card */}
            {shipment.driver && (
              <div className="p-5 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#1F1E1B] text-[#FAF8F5] flex items-center justify-center font-serif text-lg font-bold shrink-0">
                    {shipment.driver.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-base font-bold text-[#1F1E1B]">{shipment.driver.name}</h4>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-mono text-[10px] font-bold">
                        ★ {shipment.driver.rating} Verified Courier
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[#7C776E] flex items-center gap-1.5 mt-0.5">
                      <Truck className="w-3.5 h-3.5 text-[#C85A32]" />
                      {shipment.driver.vehicle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${shipment.driver.phone}`}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1F1E1B] text-white rounded-xl hover:bg-[#C85A32] transition-colors font-mono text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver ({shipment.driver.phone})</span>
                  </a>
                </div>
              </div>
            )}

            {/* 3. Live Interactive GPS Route & Map */}
            <div className="p-6 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#C85A32]" />
                  <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">Live Route & Dispatch Corridor</h3>
                </div>
                <span className="font-mono text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  GPS Active
                </span>
              </div>

              <TrackingMap
                apiUrl={apiUrl}
                vendorOrderId={shipment.vendorOrderId?._id || shipment.vendorOrderId}
                masterOrderId={shipment.orderId?._id || shipment.orderId}
                vendorCoords={shipment.origin?.coordinates || [38.7896, 8.9974]}
                buyerCoords={shipment.destination?.coordinates || [38.7620, 9.0120]}
              />
            </div>

            {/* 4. Chronological Checkpoint Timeline Events */}
            <div className="p-6 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
                <h3 className="font-serif text-lg font-bold text-[#1F1E1B] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C85A32]" />
                  Tracking Checkpoint History
                </h3>
                <span className="font-mono text-xs text-[#7C776E]">
                  {shipment.events?.length || 0} scan events recorded
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2DDD3]">
                {shipment.events?.map((ev, idx) => (
                  <div key={ev._id || idx} className="relative group">
                    {/* Checkpoint Dot */}
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                      idx === 0 ? 'bg-[#C85A32] text-white ring-4 ring-[#C85A32]/20' : 'bg-[#EAE6DF] text-[#7C776E]'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-[#1F1E1B]">
                          {ev.status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[11px] text-[#7C776E]">
                          {new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="font-sans text-xs text-[#625D54]">
                        {ev.description}
                      </p>

                      <div className="flex items-center gap-1 font-mono text-[10px] text-[#7C776E]">
                        <MapPin className="w-3 h-3 text-[#C85A32]" />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Order Contents & Escrow Protection */}
            {order && (
              <div className="p-6 bg-white border border-[#E2DDD3] rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">Order Summary ({order.orderNumber})</h3>
                    <p className="font-mono text-xs text-[#7C776E]">Total Amount: {order.totalAmount?.toLocaleString()} ETB</p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-full font-mono text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{order.escrowStatus?.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF8F5] border border-[#E2DDD3]/60 rounded-2xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <p className="font-bold text-[#1F1E1B]">{item.title}</p>
                        <p className="text-[#7C776E]">Quantity: {item.qty} · Unit Price: {item.price?.toLocaleString()} ETB</p>
                      </div>
                      <span className="font-bold text-[#1F1E1B]">
                        {(item.price * item.qty).toLocaleString()} ETB
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#FAF3F0] border border-[#EB5B00]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#625D54]">
                  <ShieldCheck className="w-4 h-4 text-[#EB5B00] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1F1E1B]">ገልጋይ (Gelgay) Escrow Protection Guarantee:</strong>
                    <p className="mt-0.5">Your funds remain safely locked in escrow until the courier delivery scan is confirmed and your 48-hour inspection period concludes.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

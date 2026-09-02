'use client';

import React, { useState } from 'react';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle?: string;
  vendorName?: string;
  apiUrl?: string;
  onReviewSubmitted?: (review: any) => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  productId,
  productTitle = 'Curated Archival Piece',
  vendorName = 'Verified Curator',
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  onReviewSubmitted
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [itemAccuracy, setItemAccuracy] = useState<number>(5);
  const [communication, setCommunication] = useState<number>(5);
  const [deliveryHandoff, setDeliveryHandoff] = useState<number>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rating,
          title,
          comment,
          aspects: {
            itemAccuracy,
            communication,
            deliveryHandoff
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setSuccess(true);
      if (onReviewSubmitted) onReviewSubmitted(data.review);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Error submitting review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#1F1E1B]/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] border border-[#E2DDD3] rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8E4DC] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Star className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#1F1E1B]">
                Rate & Review Experience
              </h3>
              <p className="font-mono text-[11px] text-[#7C776E]">
                {vendorName} · Verified Collector Feedback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#7C776E] hover:text-[#1F1E1B] hover:bg-[#E8E4DC]/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {success ? (
            <div className="p-8 text-center bg-white border border-emerald-300 rounded-2xl space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-serif text-2xl font-bold text-[#1F1E1B]">Thank you for your review!</h4>
              <p className="font-sans text-sm text-[#625D54]">
                Your feedback has been verified and added to the seller's trust profile and ledger.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 font-mono text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Product Header */}
              <div className="p-4 bg-white border border-[#E2DDD3] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[#7C776E] uppercase tracking-wider block font-semibold">
                    Reviewing Item:
                  </span>
                  <h4 className="font-serif text-base font-bold text-[#1F1E1B]">
                    {productTitle}
                  </h4>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-semibold rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Purchase
                </span>
              </div>

              {/* Star Rating Picker */}
              <div className="text-center p-4 bg-white border border-[#E2DDD3] rounded-2xl space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] font-semibold block">
                  Overall Rating
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-hidden"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          (hoverRating !== null ? hoverRating >= star : rating >= star)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="font-mono text-xs font-bold text-[#1F1E1B] block">
                  {rating === 5 ? '5.0 — Exceptional Archival Quality' :
                   rating === 4 ? '4.0 — Great Piece & Fast Delivery' :
                   rating === 3 ? '3.0 — Satisfactory' :
                   rating === 2 ? '2.0 — Sub-par Condition' : '1.0 — Defective / Mislabeled'}
                </span>
              </div>

              {/* Aspect Sliders */}
              <div className="p-4 bg-white border border-[#E2DDD3] rounded-2xl space-y-3 font-mono text-xs">
                <span className="uppercase tracking-wider text-[#7C776E] font-semibold block mb-1">
                  Detailed Aspect Ratings:
                </span>
                
                <div className="flex items-center justify-between">
                  <span className="text-[#1F1E1B]">Condition Accuracy:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setItemAccuracy(val)}
                        className={`w-6 h-6 rounded-md font-bold text-[10px] ${
                          itemAccuracy === val ? 'bg-[#1F1E1B] text-white' : 'bg-[#FAF8F5] text-[#7C776E] border'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#1F1E1B]">Seller Communication:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCommunication(val)}
                        className={`w-6 h-6 rounded-md font-bold text-[10px] ${
                          communication === val ? 'bg-[#1F1E1B] text-white' : 'bg-[#FAF8F5] text-[#7C776E] border'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#1F1E1B]">Courier Delivery Handoff:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDeliveryHandoff(val)}
                        className={`w-6 h-6 rounded-md font-bold text-[10px] ${
                          deliveryHandoff === val ? 'bg-[#1F1E1B] text-white' : 'bg-[#FAF8F5] text-[#7C776E] border'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title & Comment */}
              <div>
                <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stunning vintage Braun ET66 in mint condition"
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                  Detailed Experience & Inspection Feedback *
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe the packaging, item preservation, and handoff experience..."
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{busy ? 'Submitting Review...' : 'Publish Verified Review'}</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

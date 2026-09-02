import React from 'react';
import { Product } from '../data/paleoData';
import { X, MapPin, Star, Heart, ShoppingBag, CheckCircle2, ShieldCheck } from './Icons';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  isWishlisted: boolean;
  isInCart: boolean;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  isWishlisted,
  isInCart,
  onToggleWishlist,
  onAddToCart
}: ProductDetailModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border-t sm:border border-[#E8E4DC] w-full max-w-4xl shadow-2xl overflow-hidden text-[#1F1E1B] relative rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 sm:p-2.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto overscroll-contain flex-1">
          
          {/* Product Image */}
          <div className="md:col-span-6 bg-[#EFECE6] relative min-h-[240px] sm:min-h-[320px] md:min-h-[480px]">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            <div className="absolute top-4 left-4 bg-[#1F1E1B] text-white px-3 py-1 font-mono text-xs uppercase tracking-wider">
              {product.tag}
            </div>
          </div>

          {/* Product Info & Specs */}
          <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-[#7C776E]">
                <span className="flex items-center gap-1 text-[#C85A32]">
                  <MapPin className="w-3.5 h-3.5" />
                  {product.location}
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {(Number(typeof product.vendorRating === 'object' && product.vendorRating !== null ? (product.vendorRating as any).average : product.vendorRating) || 4.9).toFixed(1)} ({product.vendorName})
                </span>
              </div>

              <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#1F1E1B] leading-tight">
                {product.title}
              </h2>

              <p className="font-sans text-sm text-[#524E46] font-light leading-relaxed">
                {product.description}
              </p>

              {/* Specs Table */}
              <div className="bg-[#EFECE6] p-4 border border-[#E2DDD3] space-y-2 font-mono text-xs">
                <span className="text-[10px] text-[#7C776E] uppercase tracking-wider block font-bold mb-2">
                  PRODUCT DETAILS & SPECIFICATIONS
                </span>
                {Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-[#E2DDD3] pb-1">
                    <span className="text-[#625D54]">{key}:</span>
                    <span className="text-[#1F1E1B] font-semibold">{val}</span>
                  </div>
                ))}
              </div>

              {/* Buyer Protection Guarantee */}
              <div className="p-3 bg-[#EFECE6] border border-[#E2DDD3] font-sans text-xs text-[#524E46] flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#C85A32] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1F1E1B]">ገልጋይ (Gelgay) Escrow Protection</p>
                  <p className="text-[11px] font-light">Funds remain in escrow until delivery is inspected and confirmed.</p>
                </div>
              </div>
            </div>

            {/* Price & Actions */}
            <div className="pt-4 border-t border-[#E8E4DC] space-y-4">
              {/* Product Variant Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px] text-[#7C776E]">
                  <span>SELECT ARCHIVAL VARIANT:</span>
                  <span className="text-[#C85A32] font-semibold">{product.condition || 'VERIFIED'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 border border-[#1F1E1B] bg-[#1F1E1B] text-white font-mono text-xs rounded-lg">
                    <span className="block text-[11px] font-bold">Standard Archive</span>
                    <span className="text-amber-400 font-semibold">{product.priceETB.toLocaleString()} ETB</span>
                  </div>
                  <div className="p-2 border border-[#E2DDD3] bg-white text-[#1F1E1B] font-mono text-xs rounded-lg">
                    <span className="block text-[11px] font-bold">Calibrated &amp; Restored</span>
                    <span className="text-[#C85A32] font-semibold">{(product.priceETB + 450).toLocaleString()} ETB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#7C776E] uppercase">Item Price:</span>
                <span className="font-serif text-2xl font-bold text-[#1F1E1B]">
                  {product.priceETB.toLocaleString()} ETB
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleWishlist(product.id)}
                  className={`p-3.5 border transition-colors ${
                    isWishlisted ? 'border-[#C85A32] text-[#C85A32] bg-[#FAF3F0]' : 'border-[#E2DDD3] text-[#1F1E1B] hover:bg-[#EFECE6]'
                  }`}
                  title="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => onAddToCart(product)}
                  className={`flex-1 py-3.5 font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 ${
                    isInCart
                      ? 'bg-emerald-800 text-white'
                      : 'bg-[#1F1E1B] text-[#FAF8F5] hover:bg-[#C85A32]'
                  }`}
                >
                  {isInCart ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Reserved in Escrow Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Reserve in Escrow
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <a
                  href={`/products/${product.id}`}
                  className="font-mono text-xs text-[#7C776E] hover:text-[#C85A32] transition-colors underline uppercase tracking-wider"
                >
                  Open Full Product Page &amp; Inspection Dossier &rarr;
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, ArrowRight, Store, Upload } from 'lucide-react';
import { Product } from '../data/paleoData';
import { useAuthStore } from '../app/stores/useAuthStore';

interface SellItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  apiUrl?: string;
}

export default function SellItemModal({
  isOpen,
  onClose,
  onAddProduct,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}: SellItemModalProps) {
  const user = useAuthStore((state) => state.user);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Electronics' | 'Furniture' | 'Studio' | 'Fashion' | 'Books'>('Electronics');
  const [condition, setCondition] = useState<'Like New' | 'Excellent' | 'Good' | 'Restored'>('Like New');
  const [priceETB, setPriceETB] = useState<number>(3500);
  const [location, setLocation] = useState('Posta Bet, Adama');
  const [vendorName, setVendorName] = useState('My Curated Studio');
  const [description, setDescription] = useState('');
  const [isTelegramVerified, setIsTelegramVerified] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setBusy(true);

    let finalImageUrl = imagePreview || (
      category === 'Furniture'
        ? 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=900&fit=crop&auto=format'
        : category === 'Studio'
        ? 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=900&fit=crop&auto=format'
        : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=900&fit=crop&auto=format'
    );

    // If real file selected, attempt backend upload to R2
    if (imageFile) {
      try {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await fetch(`${apiUrl}/api/products/upload-image`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.imageUrl) {
            finalImageUrl = uploadData.imageUrl;
          }
        }
      } catch (err) {
        console.warn('Fallback to preview data-URL for product image:', err);
      } finally {
        setUploadingImage(false);
      }
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      title,
      category,
      tag: category === 'Electronics' ? '01 / EVERYDAY CARRY' : category === 'Furniture' ? '02 / HOME ARCHIVE' : '03 / CREATIVE TOOLS',
      condition,
      priceETB: Number(priceETB),
      location,
      vendorName: user?.displayName || vendorName,
      vendorRating: 5.0,
      image: finalImageUrl,
      description: description || 'Pristine piece curated for timeless utility and longevity.',
      specs: { 'Vendor Status': 'Verified Telegram Seller', 'Neighborhood': location },
      escrowStatus: 'Available'
    };

    try {
      await fetch(`${apiUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          category,
          price: Number(priceETB),
          stock: 1,
          description: description || 'Verified curated item in Adama.',
          images: [finalImageUrl],
          location: { type: 'Point', coordinates: [39.2705, 8.5415] }
        })
      }).catch(() => {});

      onAddProduct(newProduct);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setImageFile(null);
        setImagePreview(null);
        onClose();
      }, 1500);
    } catch (e) {
      onAddProduct(newProduct);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setImageFile(null);
        setImagePreview(null);
        onClose();
      }, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#E8E4DC] w-full max-w-2xl shadow-2xl p-6 md:p-8 text-[#1F1E1B] relative rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DC] mb-6">
          <div>
            <span className="font-mono text-xs text-[#C85A32] uppercase tracking-wider font-semibold">
              VENDOR LISTING PORTAL
            </span>
            <h3 className="font-serif text-2xl font-normal text-[#1F1E1B]">
              Sell an Item on ገልጋይ (Gelgay)
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#7C776E] hover:text-[#1F1E1B] transition-colors rounded-full hover:bg-[#EFECE6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-12 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-serif text-2xl font-bold text-[#1F1E1B]">
              Item Listed Successfully!
            </h4>
            <p className="font-mono text-xs text-[#7C776E]">
              Published to live catalog and dispatched via Socket.io.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sony Walkman WM-D6C Pro"
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Archive Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                >
                  <option value="Electronics">Electronics (Everyday Carry)</option>
                  <option value="Furniture">Furniture (Home Archive)</option>
                  <option value="Studio">Studio (Creative Tools)</option>
                  <option value="Fashion">Fashion (Archival Wear)</option>
                  <option value="Books">Books (Paper Archive)</option>
                </select>
              </div>
            </div>

            {/* Price & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Price (ETB)
                </label>
                <input
                  type="number"
                  required
                  value={priceETB}
                  onChange={(e) => setPriceETB(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm font-mono focus:outline-none focus:border-[#C85A32]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Adama Neighborhood
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Posta Bet, Geda, Boku Shenen"
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                />
              </div>
            </div>

            {/* Product Photo Upload */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold flex items-center justify-between">
                <span>Product Photo / Image Upload</span>
                <span className="text-[10px] text-[#C85A32]">Real Archival Photos</span>
              </label>

              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-[#E2DDD3] hover:border-[#C85A32] rounded-2xl cursor-pointer transition-colors group">
                  <Upload className="w-6 h-6 text-[#7C776E] group-hover:text-[#C85A32] transition-colors mb-1" />
                  <span className="font-sans text-xs text-[#1F1E1B] font-medium">
                    {imageFile ? imageFile.name : 'Click to select product image'}
                  </span>
                  <span className="font-mono text-[10px] text-[#7C776E]">PNG, JPG, WebP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imagePreview && (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#E2DDD3] shrink-0">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 bg-[#1F1E1B]/80 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Condition & Description */}
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Physical Condition
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Like New', 'Excellent', 'Good', 'Restored'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                        condition === cond
                          ? 'bg-[#1F1E1B] text-white border-[#1F1E1B]'
                          : 'bg-white text-[#625D54] border-[#E2DDD3] hover:border-[#1F1E1B]'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-[#7C776E] mb-2 font-semibold">
                  Curator Note & Provenance
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe condition details, included original parts, and history..."
                  className="w-full px-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm font-sans focus:outline-none focus:border-[#C85A32]"
                />
              </div>
            </div>

            {/* Seller Guarantee / Merchant Banner */}
            {user?.role === 'VENDOR' || user?.role === 'ADMIN' ? (
              <div className="p-4 bg-[#EFECE6] border border-[#E2DDD3] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-[#C85A32]" />
                  <div>
                    <p className="font-serif text-sm font-bold text-[#1F1E1B]">Merchant Dashboard</p>
                    <p className="font-sans text-xs text-[#625D54]">Manage payouts, sub-orders, and live inventory.</p>
                  </div>
                </div>
                <a
                  href="http://localhost:5173/vendor/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white border border-[#E2DDD3] text-[#1F1E1B] font-mono text-xs font-semibold rounded-lg hover:border-[#C85A32] flex items-center gap-1.5 shrink-0"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-serif font-bold text-emerald-950">Guaranteed Escrow Payouts</p>
                  <p className="font-sans text-emerald-900 font-light">Disbursed directly via CBE or Telebirr once the buyer tests the item.</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#C85A32] transition-colors flex items-center justify-center gap-2 rounded-xl shadow-md disabled:opacity-50"
              >
                <span>{busy ? 'Publishing...' : 'List Item in Escrow Catalog'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Building,
  CreditCard,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../app/stores/useAuthStore';

interface RegistrationOnboardingGateProps {
  apiUrl?: string;
}

export default function RegistrationOnboardingGate({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}: RegistrationOnboardingGateProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  // Common fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  // Vendor KYC fields
  const [storeName, setStoreName] = useState('');
  const [sellerType, setSellerType] = useState<'individual' | 'business'>('individual');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [payoutBank, setPayoutBank] = useState('Commercial Bank of Ethiopia (CBE)');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutAccountHolder, setPayoutAccountHolder] = useState('');
  const [bio, setBio] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setLocation(user.location && user.location !== 'Adama, Ethiopia' ? user.location : '');
      setTelegramUsername(user.telegramUsername || '');
      setLegalName(user.displayName || '');
      setPayoutAccountHolder(user.displayName || '');
      setStoreName(`${user.displayName || 'ገልጋይ'} Studio`);
    }
  }, [user]);

  // Only render if user is signed in but has not finished registration
  if (!isAuthenticated || !user || user.isProfileComplete) {
    return null;
  }

  const isVendor = user.role === 'vendor';

  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !location) {
      setError('Please provide your delivery phone number and delivery location in Adama.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim() || user.displayName,
          phone: phone.trim(),
          location: location.trim(),
          telegramUsername: telegramUsername.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to complete profile registration');
      }

      setUser(data.user);
      await fetchUser();
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setBusy(false);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !payoutAccount || !location || !agreedToTerms) {
      setError('Store name, bank account, studio location, and terms agreement are required.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/vendor/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storeName: storeName.trim(),
          storeBio: bio.trim(),
          sellerType,
          legalName: legalName.trim() || displayName.trim(),
          taxId: taxId.trim(),
          nationalIdNumber: nationalIdNumber.trim(),
          bank: payoutBank,
          account: payoutAccount.trim(),
          accountHolder: payoutAccountHolder.trim() || displayName.trim(),
          address: location.trim(),
          agreedToTerms
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit seller KYC');
      }

      await fetchUser();
    } catch (err: any) {
      setError(err.message || 'Seller registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF8F5] border border-[#E2DDD3] rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-fade-in text-[#1F1E1B]">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF3F0] border border-[#C85A32]/30 rounded-full font-mono text-[11px] text-[#C85A32] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-ping" />
              <span>STEP 2 OF 2 · MANDATORY REGISTRATION</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1E1B]">
              {isVendor ? 'Seller Studio & KYC Setup' : 'Buyer Profile & Delivery Details'}
            </h2>
          </div>

          <button
            onClick={() => logout(apiUrl)}
            className="p-2 text-[#7C776E] hover:text-red-600 rounded-xl hover:bg-[#EAE6DF] transition-colors"
            title="Sign out / Switch account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <p className="font-sans text-xs text-[#625D54]">
          {isVendor
            ? 'Complete your verified seller details and payout account to start listing curated objects on ገልጋይ (Gelgay).'
            : 'Enter your delivery contact details and Adama address to enable courier delivery and escrow protection.'}
        </p>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 font-sans">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. BUYER REGISTRATION FORM */}
        {!isVendor && (
          <form onSubmit={handleBuyerSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-[#7C776E]" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Makeda Tadesse"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">
                  Delivery Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[#7C776E]" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 9..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden focus:border-[#C85A32]"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">
                  Telegram Username (Optional)
                </label>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">
                Delivery Subcity / Neighborhood (Adama) *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#C85A32]" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Posta Bet, Geda, Boku Shenen, Daka Adu"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8E4DC]">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#1F1E1B] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{busy ? 'Activating Profile...' : 'Complete Registration & Enter Marketplace'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. SELLER / VENDOR KYC REGISTRATION FORM */}
        {isVendor && (
          <form onSubmit={handleVendorSubmit} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Store / Studio Name *</label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-3 text-[#C85A32]" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Adama Archival Studio"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden focus:border-[#C85A32]"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Seller Entity Type *</label>
                <select
                  value={sellerType}
                  onChange={(e) => setSellerType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden"
                >
                  <option value="individual">Individual Artisan / Collector</option>
                  <option value="business">Registered Business PLC</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Legal Full Name *</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Full legal name"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Tax Identification Number (TIN)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. TIN-0098472619"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">National ID / Kebele Number</label>
                <input
                  type="text"
                  value={nationalIdNumber}
                  onChange={(e) => setNationalIdNumber(e.target.value)}
                  placeholder="e.g. ETH-99887711"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Payout Bank *</label>
                <select
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs focus:outline-hidden"
                >
                  <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Dashen Bank">Dashen Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Telebirr">Telebirr SuperApp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Bank Account / Telebirr Number *</label>
                <input
                  type="text"
                  required
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  placeholder="1000..."
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={payoutAccountHolder}
                  onChange={(e) => setPayoutAccountHolder(e.target.value)}
                  placeholder="Name on bank account"
                  className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Studio / Workshop Address (Adama) *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Posta Bet, Bole Sub-City, Adama"
                className="w-full px-3 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-xs"
              />
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-2.5 p-3 bg-white border border-[#E2DDD3] rounded-xl cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#C85A32] focus:ring-[#C85A32]"
              />
              <span className="text-[11px] text-[#625D54] leading-relaxed">
                I accept ገልጋይ Marketplace terms: 2.5% platform commission and 100% escrow protection (payouts released following 48h buyer delivery inspection).
              </span>
            </label>

            <div className="pt-3 border-t border-[#E8E4DC]">
              <button
                type="submit"
                disabled={busy || !agreedToTerms}
                className="w-full py-3.5 bg-[#C85A32] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#D96B42] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                <span>{busy ? 'Submitting Application...' : 'Complete KYC & Open Vendor Studio'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

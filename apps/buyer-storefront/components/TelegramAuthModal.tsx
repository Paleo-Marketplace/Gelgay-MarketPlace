'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Send,
  CheckCircle2,
  Copy,
  User,
  LogOut,
  ArrowRight,
  Store,
  Shield,
  Truck,
  Loader2,
  ShoppingBag,
  ShieldCheck,
  Heart,
  Sparkles,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle,
  Camera,
  Edit3,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../app/stores/useAuthStore';

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl?: string;
  onSuccess?: (user: any) => void;
  onOpenSell?: () => void;
  promptReason?: string;
  initialMode?: 'signin' | 'signup';
}

export default function TelegramAuthModal({
  isOpen,
  onClose,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  onSuccess,
  onOpenSell,
  promptReason,
  initialMode
}: TelegramAuthModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutAction = useAuthStore((state) => state.logout);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const globalReason = useAuthStore((state) => state.authModalReason);
  const globalMode = useAuthStore((state) => state.authModalMode);

  // Auth Modes: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode || globalMode || 'signin');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'vendor'>('buyer');

  useEffect(() => {
    if (isOpen) {
      if (initialMode) setAuthMode(initialMode);
      else if (globalMode) setAuthMode(globalMode);
    }
  }, [isOpen, initialMode, globalMode]);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Seller KYC Application States
  const [isApplyingVendor, setIsApplyingVendor] = useState(false);
  const [sellerType, setSellerType] = useState<'individual' | 'business'>('individual');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [payoutBank, setPayoutBank] = useState('Commercial Bank of Ethiopia (CBE)');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutAccountHolder, setPayoutAccountHolder] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [copied, setCopied] = useState(false);
  const [telegramSession, setTelegramSession] = useState<{ token: string; deepLink: string } | null>(null);
  const [isStartingTelegram, setIsStartingTelegram] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = async () => {
    try {
      const user = await fetchUser(apiUrl);
      if (user && onSuccess) onSuccess(user);
    } catch (e) {}
  };

  const startTelegramSession = async () => {
    setIsStartingTelegram(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/telegram/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      });
      const data = await res.json();
      if (data.success && data.sessionToken) {
        setTelegramSession({
          token: data.sessionToken,
          deepLink: data.deepLink || `https://t.me/PaleoMarketBot?start=${data.sessionToken}`
        });
      }
    } catch (err) {
      console.error('Failed to initiate Telegram session:', err);
    } finally {
      setIsStartingTelegram(false);
    }
  };

  // Role-based portal redirect handler
  const handleAuthenticatedUser = (authenticatedUser: any) => {
    setUser(authenticatedUser);

    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '/admin/';
    const vendorUrl = process.env.NEXT_PUBLIC_VENDOR_URL || '/vendor/';
    const courierUrl = process.env.NEXT_PUBLIC_COURIER_URL || '/courier/';

    if (authenticatedUser?.role === 'admin') {
      setMessage({
        type: 'success',
        text: '🛡️ Welcome System Administrator! Redirecting to Admin Console...'
      });
      setTimeout(() => {
        window.location.href = adminUrl;
      }, 750);
      return;
    }

    if (authenticatedUser?.role === 'vendor' && authenticatedUser?.isProfileComplete === true && (selectedRole === 'vendor' || !selectedRole)) {
      setMessage({
        type: 'success',
        text: '🏪 Welcome Merchant! Redirecting to Vendor Studio Dashboard...'
      });
      setTimeout(() => {
        window.location.href = vendorUrl;
      }, 750);
      return;
    }

    if (authenticatedUser?.isProfileComplete === false) {
      setIsEditingProfile(true);
    }

    if (authenticatedUser?.role === 'courier') {
      setMessage({
        type: 'success',
        text: '🛵 Welcome Courier! Redirecting to Dispatch Web View...'
      });
      setTimeout(() => {
        window.location.href = courierUrl;
      }, 750);
      return;
    }

    setMessage({
      type: 'success',
      text: 'Signed in successfully.'
    });
    if (onSuccess) onSuccess(authenticatedUser);
  };

  // Poll Telegram Session verification
  useEffect(() => {
    if (!isOpen || !telegramSession?.token || currentUser) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/telegram/session/${telegramSession.token}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.verified && data.user) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          handleAuthenticatedUser(data.user);
        }
      } catch (err) {}
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, telegramSession, currentUser, apiUrl, onSuccess, setUser]);

  useEffect(() => {
    if (isOpen) {
      checkSession();
      startTelegramSession();
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setTelegramSession(null);
      setMessage(null);
      setIsEditingProfile(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.storeName || storeName || currentUser.displayName || '');
      setLegalName(currentUser.displayName || displayName || '');
      setEditPhone(currentUser.phone || '');
      setEditBio(currentUser.bio || '');
      setEditLocation(currentUser.location || '');
      setEditTelegram(currentUser.telegramUsername || '');

      // Once completed, never ask to setup information again
      const isComplete = currentUser.isProfileComplete === true;

      if (isComplete) {
        setIsEditingProfile(false);
      } else {
        setIsEditingProfile(true);
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (telegramSession?.deepLink) {
      navigator.clipboard.writeText(telegramSession.deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logoutAction(apiUrl);
      setMessage({ type: 'success', text: 'Signed out successfully.' });
      startTelegramSession();
    } catch (e) {
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${apiUrl}/api/auth/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload photo');
      }

      setUser(data.user);
      setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error uploading photo' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: editName,
          phone: editPhone,
          bio: editBio,
          location: editLocation,
          telegramUsername: editTelegram
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setUser(data.user);
      setIsEditingProfile(false);
      setMessage({ type: 'success', text: 'Profile details saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setBusy(false);
    }
  };

  const handleVendorKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !payoutAccount || !agreedToTerms) {
      setMessage({ type: 'error', text: 'Store name, bank account, and agreement to seller terms are required.' });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiUrl}/api/vendor/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storeName: editName,
          storeBio: editBio,
          sellerType,
          legalName: legalName || editName,
          taxId,
          nationalIdNumber,
          bank: payoutBank,
          account: payoutAccount,
          accountHolder: payoutAccountHolder || editName,
          address: editLocation,
          agreedToTerms
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit seller KYC');
      }

      await checkSession();
      setIsApplyingVendor(false);
      setIsEditingProfile(false);
      setMessage({
        type: 'success',
        text: '🎉 Seller KYC Application approved! Your Vendor Studio is now active.'
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'KYC submission failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const isSignUp = authMode === 'signup';
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp
      ? { email, password, displayName, role: selectedRole, storeName: selectedRole === 'vendor' ? storeName : undefined }
      : { email, password };

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (isSignUp ? 'Registration failed' : 'Sign in failed'));
      }

      if (data.user) {
        setUser(data.user);
        if (data.user.isProfileComplete === false) {
          setIsEditingProfile(true);
        }
        handleAuthenticatedUser(data.user);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication error' });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    try {
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${apiUrl}/api/auth/google/url?role=${selectedRole}&returnUrl=${encodeURIComponent(returnUrl)}&origin=${encodeURIComponent(clientOrigin)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || 'Google Auth is currently in development mode');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setBusy(false);
    }
  };

  const handleDevSession = async (role: 'buyer' | 'vendor' | 'admin', name?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, displayName: name })
      });
      const data = await res.json();
      if (data.success && data.user) {
        handleAuthenticatedUser(data.user);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const userRole = (currentUser?.role || 'BUYER').toUpperCase();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#1F1E1B]/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] border border-[#E2DDD3] rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8E4DC] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/gelgay_icon.png"
              alt="ገልጋይ"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h3 className="font-serif text-xl font-normal text-[#1F1E1B]">
                {currentUser ? 'ገልጋይ Profile & Role' : authMode === 'signup' ? 'Create ገልጋይ Account' : 'Sign In to ገልጋይ (Gelgay)'}
              </h3>
              <p className="font-mono text-[11px] text-[#7C776E] tracking-tight">
                Curated Ethiopian Marketplace · Escrow Protected · Good things deserve second life
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#7C776E] hover:text-[#1F1E1B] hover:bg-[#E8E4DC]/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Feedback Message */}
          {message && (
            <div className={`p-4 rounded-2xl font-mono text-xs flex items-center gap-3 border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* 1. AUTHENTICATED USER PROFILE VIEW */}
          {currentUser ? (
            <div className="space-y-6">
              
              {/* Registration Incomplete Notice for New Signups (Buyer / Seller) */}
              {(!currentUser.isProfileComplete || !currentUser.phone || !currentUser.location) && (
                <div className="p-4 bg-[#FAF3F0] border-2 border-[#C85A32]/40 rounded-2xl space-y-1.5 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#C85A32]">
                    <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
                    <span>Step 2/2: Complete Account Registration</span>
                  </div>
                  <p className="font-sans text-xs text-[#625D54]">
                    {userRole === 'VENDOR'
                      ? 'Welcome Merchant! Please complete your Studio KYC details (store pickup location, payout bank account, and legal name) below to activate your listings and payouts.'
                      : 'Welcome! Please add your phone number and delivery neighborhood in Adama below so couriers can coordinate escrow handoffs and live tracking.'}
                  </p>
                </div>
              )}

              {/* Profile Card with Photo Uploader */}
              <div className="p-5 bg-white border border-[#E2DDD3] rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#7C776E] uppercase tracking-wider font-semibold">
                    IDENTITY & PROFILE
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs font-mono text-[#C85A32] flex items-center gap-1 font-semibold hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Details'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Avatar with Camera upload button */}
                    <div className="relative group">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-[#FAF3F0] border-2 border-[#C85A32] flex items-center justify-center font-serif font-bold text-xl text-[#C85A32] shrink-0">
                        {currentUser.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.displayName || 'Avatar'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          currentUser.displayName ? currentUser.displayName[0] : (currentUser.telegramUsername ? currentUser.telegramUsername[0].toUpperCase() : 'U')
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 p-1.5 bg-[#1F1E1B] text-white rounded-full hover:bg-[#C85A32] transition-colors shadow-sm"
                        title="Upload profile photo"
                      >
                        {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                      </button>

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#1F1E1B]">
                        {currentUser.displayName || (currentUser.telegramUsername ? `@${currentUser.telegramUsername}` : 'ገልጋይ Member')}
                      </h4>
                      <p className="font-mono text-xs text-[#7C776E]">
                        {currentUser.email || (currentUser.telegramUsername ? `@${currentUser.telegramUsername}` : 'Verified Account')}
                      </p>
                      {currentUser.location && (
                        <p className="font-sans text-[11px] text-[#625D54] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#C85A32]" />
                          {currentUser.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider rounded-full font-semibold">
                    {userRole}
                  </span>
                </div>

                {/* Profile Editing & KYC Onboarding Form Drawer */}
                {isEditingProfile && (
                  (userRole === 'VENDOR' || isApplyingVendor) ? (
                    /* DEDICATED SELLER KYC APPLICATION FORM */
                    <form onSubmit={handleVendorKycSubmit} className="pt-3 border-t border-[#E8E4DC] space-y-3.5 font-sans">
                      <div className="p-3 bg-[#FAF3F0] border border-[#C85A32]/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#C85A32]">
                            <Store className="w-4 h-4 text-[#C85A32]" />
                            <span>🏪 Seller Studio & KYC Verification Application</span>
                          </div>
                          {isApplyingVendor && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsApplyingVendor(false);
                                setIsEditingProfile(false);
                              }}
                              className="font-mono text-[10px] text-[#7C776E] hover:text-[#C85A32] underline"
                            >
                              Cancel Application
                            </button>
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-[#625D54]">
                          Register your artisan workshop or vintage studio to list curated objects and receive bank payouts.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Store / Studio Name *</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Adama Archival Studio"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>

                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Seller Entity Type *</label>
                          <select
                            value={sellerType}
                            onChange={(e) => setSellerType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          >
                            <option value="individual">Individual Artisan / Collector</option>
                            <option value="business">Registered Business PLC</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Legal Full Name / Business Name *</label>
                          <input
                            type="text"
                            required
                            value={legalName}
                            onChange={(e) => setLegalName(e.target.value)}
                            placeholder="Full name as on ID"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>

                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Tax Identification Number (TIN)</label>
                          <input
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            placeholder="e.g. TIN-0098472619"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">National ID / Kebele Card Number</label>
                          <input
                            type="text"
                            value={nationalIdNumber}
                            onChange={(e) => setNationalIdNumber(e.target.value)}
                            placeholder="e.g. ETH-88291048"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>

                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Payout Bank *</label>
                          <select
                            value={payoutBank}
                            onChange={(e) => setPayoutBank(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          >
                            <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                            <option value="Awash Bank">Awash Bank</option>
                            <option value="Dashen Bank">Dashen Bank</option>
                            <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                            <option value="Telebirr">Telebirr SuperApp</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Bank Account / Telebirr Number *</label>
                          <input
                            type="text"
                            required
                            value={payoutAccount}
                            onChange={(e) => setPayoutAccount(e.target.value)}
                            placeholder="1000..."
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Account Holder Name</label>
                          <input
                            type="text"
                            value={payoutAccountHolder}
                            onChange={(e) => setPayoutAccountHolder(e.target.value)}
                            placeholder="Name as registered on bank"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Studio / Workshop Pickup Location (Adama) *</label>
                        <input
                          type="text"
                          required
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. Posta Bet, Bole Sub-City, Adama"
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                        />
                      </div>

                      <div>
                        <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Studio Bio / Curation Specialty</label>
                        <textarea
                          rows={2}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Describe your vintage pieces, restored items, or handmade creations..."
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                        />
                      </div>

                      {/* Agreement Checkbox */}
                      <label className="flex items-start gap-2.5 p-3 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 rounded text-[#C85A32] focus:ring-[#C85A32]"
                        />
                        <span className="text-[11px] text-[#625D54] leading-relaxed">
                          I agree to ገልጋይ Marketplace terms: 2.5% platform commission and 100% escrow protection (funds disbursed following 48h buyer delivery inspection).
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={busy || !agreedToTerms}
                        className="w-full py-2.5 bg-[#C85A32] text-white font-mono text-xs font-semibold rounded-xl hover:bg-[#D96B42] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {busy ? 'Submitting Application...' : 'Submit KYC & Open Vendor Studio'}
                      </button>
                    </form>
                  ) : (
                    /* DEDICATED BUYER PROFILE FORM */
                    <form onSubmit={handleSaveProfile} className="pt-3 border-t border-[#E8E4DC] space-y-3 font-sans">
                      <div>
                        <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Full Display Name *</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Phone Number (For Deliveries) *</label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+251 9..."
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Telegram Handle</label>
                          <input
                            type="text"
                            value={editTelegram}
                            onChange={(e) => setEditTelegram(e.target.value)}
                            placeholder="@username"
                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-mono text-[11px] text-[#7C776E] block mb-1 font-semibold">Adama Neighborhood / Delivery Address *</label>
                        <input
                          type="text"
                          required
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. Posta Bet, Geda, Boku Shenen, Daka Adu"
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 bg-[#1F1E1B] text-white font-mono text-xs font-semibold rounded-xl hover:bg-[#C85A32] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {busy ? 'Saving Profile...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  )
                )}
              </div>

              {/* RBAC-Protected Navigation & Actions */}
              {userRole === 'BUYER' && (
                <div className="space-y-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] block font-semibold">
                    Buyer Hub & Escrow Actions:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/orders"
                      onClick={onClose}
                      className="p-4 bg-white border border-[#E2DDD3] rounded-2xl hover:border-[#C85A32] transition-colors flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-5 h-5 text-[#C85A32]" />
                        <div>
                          <p className="font-serif text-sm font-semibold text-[#1F1E1B]">Order Tracking Hub</p>
                          <p className="font-mono text-[10px] text-[#7C776E]">Past Orders & Live Courier GPS</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7C776E] group-hover:text-[#C85A32] group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href="/buyer-protection"
                      onClick={onClose}
                      className="p-4 bg-white border border-[#E2DDD3] rounded-2xl hover:border-[#C85A32] transition-colors flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        <div>
                          <p className="font-serif text-sm font-semibold text-[#1F1E1B]">Buyer Protection</p>
                          <p className="font-mono text-[10px] text-[#7C776E]">48h Inspection Window</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7C776E] group-hover:text-[#C85A32] group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                  {/* Merchant CTA */}
                  <div className="p-4 bg-[#FAF3F0] border border-[#C85A32]/20 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <p className="font-serif text-sm font-bold text-[#1F1E1B]">Want to sell curated vintage?</p>
                      <p className="font-sans text-xs text-[#625D54]">Join our verified Adama neighborhood network.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsApplyingVendor(true);
                        setIsEditingProfile(true);
                      }}
                      className="px-3.5 py-2 bg-[#C85A32] text-white font-mono text-xs font-semibold rounded-xl hover:bg-[#D96B42] transition-colors shrink-0"
                    >
                      Become a Seller
                    </button>
                  </div>
                </div>
              )}

              {userRole === 'VENDOR' && (
                <div className="space-y-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] block font-semibold">
                    Authorized Seller Portal:
                  </span>
                  <a
                    href={process.env.NEXT_PUBLIC_VENDOR_URL || '/vendor/'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 bg-white border border-[#C85A32] rounded-2xl hover:bg-[#FAF3F0] transition-colors flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-6 h-6 text-[#C85A32]" />
                      <div>
                        <p className="font-serif text-sm font-bold text-[#1F1E1B]">Open Vendor Dashboard</p>
                        <p className="font-mono text-xs text-[#7C776E]">Inventory CRUD, Order Dispatch & Payouts</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#C85A32] group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              )}

              {userRole === 'ADMIN' && (
                <div className="space-y-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] block font-semibold">
                    Global Superuser Operations:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={process.env.NEXT_PUBLIC_ADMIN_URL || '/admin/'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 bg-white border border-stone-800 rounded-2xl hover:bg-stone-900 hover:text-white transition-all flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-[#C85A32]" />
                        <div>
                          <p className="font-serif text-sm font-bold">Admin Console</p>
                          <p className="font-mono text-[10px] text-[#7C776E] group-hover:text-stone-300">Escrow, Disputes & KYC</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7C776E] group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <a
                      href={process.env.NEXT_PUBLIC_VENDOR_URL || '/vendor/'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 bg-white border border-[#E2DDD3] rounded-2xl hover:border-[#C85A32] transition-colors flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Store className="w-5 h-5 text-[#C85A32]" />
                        <div>
                          <p className="font-serif text-sm font-bold text-[#1F1E1B]">Vendor Hub</p>
                          <p className="font-mono text-[10px] text-[#7C776E]">Catalog Management</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7C776E] group-hover:text-[#C85A32] group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              )}

              {/* Account Actions */}
              <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                <button
                  onClick={handleLogout}
                  disabled={busy}
                  className="px-4 py-2 bg-white border border-red-200 text-red-700 font-mono text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          ) : (
            /* 2. UNAUTHENTICATED SIGN IN / SIGN UP FORM */
            <div className="space-y-6">
              
              {/* Optional Prompt Reason Banner (e.g. triggered by Guest Checkout or Add to Cart) */}
              {(promptReason || globalReason) && (
                <div className="p-4 bg-gradient-to-r from-[#FAF3F0] via-white to-[#FAF3F0] border-2 border-[#C85A32]/40 rounded-2xl space-y-2.5 shadow-xs animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#C85A32]/10 rounded-xl text-[#C85A32] shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-[#C85A32]" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-[#1F1E1B]">
                        100% Escrow Buyer Protection
                      </h4>
                      <p className="font-sans text-xs text-[#625D54] leading-relaxed mt-0.5">
                        {promptReason || globalReason}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] text-[#7C776E]">
                    <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] text-center font-medium">
                      🔒 Bank Escrow Vault
                    </div>
                    <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] text-center font-medium">
                      ⚡ Instant CBE/Telebirr
                    </div>
                    <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] text-center font-medium">
                      🚚 GPS Courier Delivery
                    </div>
                  </div>
                </div>
              )}

              {/* Sign In vs Sign Up Tabs */}
              <div className="flex p-1 bg-[#E8E4DC]/60 rounded-2xl border border-[#E2DDD3]">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setMessage(null); }}
                  className={`flex-1 py-2.5 font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    authMode === 'signin'
                      ? 'bg-white text-[#1F1E1B] shadow-xs'
                      : 'text-[#7C776E] hover:text-[#1F1E1B]'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setMessage(null); }}
                  className={`flex-1 py-2.5 font-mono text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    authMode === 'signup'
                      ? 'bg-white text-[#1F1E1B] shadow-xs'
                      : 'text-[#7C776E] hover:text-[#1F1E1B]'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Role Selector during Sign Up */}
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="font-mono text-xs text-[#7C776E] font-semibold uppercase tracking-wider block">
                    Account Role:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('buyer')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        selectedRole === 'buyer'
                          ? 'bg-white border-[#C85A32] ring-1 ring-[#C85A32] shadow-xs'
                          : 'bg-white/60 border-[#E2DDD3] hover:border-[#1F1E1B]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-serif text-sm font-bold text-[#1F1E1B]">
                        <ShoppingBag className="w-4 h-4 text-[#C85A32]" />
                        <span>Buyer</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#625D54] mt-1 font-light">
                        Discover & purchase items with 100% escrow protection.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('vendor')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        selectedRole === 'vendor'
                          ? 'bg-white border-[#C85A32] ring-1 ring-[#C85A32] shadow-xs'
                          : 'bg-white/60 border-[#E2DDD3] hover:border-[#1F1E1B]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-serif text-sm font-bold text-[#1F1E1B]">
                        <Store className="w-4 h-4 text-[#C85A32]" />
                        <span>Seller / Curator</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#625D54] mt-1 font-light">
                        List archival pieces and receive payouts to your bank.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                      Full Name / Display Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#7C776E]" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Makeda Tadesse"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                      />
                    </div>
                  </div>
                )}

                {authMode === 'signup' && selectedRole === 'vendor' && (
                  <div>
                    <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                      Store / Studio Name
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 absolute left-3.5 top-3.5 text-[#7C776E]" />
                      <input
                        type="text"
                        required
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Kazanchis Analog Vault"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#7C776E]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.et"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs text-[#7C776E] block mb-1 font-semibold">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#7C776E]" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD3] rounded-xl text-sm focus:outline-hidden focus:border-[#C85A32] font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{busy ? 'Processing...' : authMode === 'signup' ? `Register as ${selectedRole.toUpperCase()}` : 'Sign In'}</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8E4DC]" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#FAF8F5] px-3 font-mono text-[10px] text-[#7C776E]">Or continue with</span></div>
              </div>

              {/* Alternate Providers: Google & Telegram */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={busy}
                  className="w-full p-3 bg-white border border-[#E2DDD3] hover:border-[#C85A32] rounded-2xl flex items-center justify-center gap-2.5 transition-colors font-sans text-xs font-medium text-[#1F1E1B] shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {authMode === 'signup'
                      ? selectedRole === 'vendor'
                        ? 'Register as Seller with Google'
                        : 'Register as Buyer with Google'
                      : 'Sign in with Google'}
                  </span>
                </button>

                {/* Telegram Bot Direct Deep Link */}
                {telegramSession ? (
                  <div className="p-4 bg-white border border-[#229ED9]/30 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center">
                          <Send className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-serif text-sm font-bold text-[#1F1E1B]">Telegram One-Click Auth</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#0088cc] font-semibold animate-pulse">
                        Waiting for Bot Start...
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={telegramSession.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 bg-[#229ED9] text-white text-center font-mono text-xs font-semibold rounded-xl hover:bg-[#1E88C7] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Open @PaleoMarketBot</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2.5 border border-[#E2DDD3] rounded-xl hover:bg-[#FAF8F5] text-[#7C776E] transition-colors"
                        title="Copy link"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center font-mono text-xs text-[#7C776E] flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Preparing Telegram Bot link...</span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

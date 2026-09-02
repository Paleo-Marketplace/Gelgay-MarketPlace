'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, ArrowRight, CheckCircle2, ShieldCheck, User } from './Icons';
import { useAuthStore } from '../app/stores/useAuthStore';

interface InlineAuthFooterProps {
  onAccountClick: () => void;
  apiUrl?: string;
}

export default function InlineAuthFooter({
  onAccountClick,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}: InlineAuthFooterProps) {
  const [busy, setBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleGoogleAuth = async () => {
    setBusy(true);
    try {
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${apiUrl}/api/auth/google/url?role=buyer&returnUrl=${encodeURIComponent(returnUrl)}&origin=${encodeURIComponent(clientOrigin)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        onAccountClick();
      }
    } catch (e) {
      onAccountClick();
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="bg-[#1F1E1B] text-[#FAF8F5] pt-20 pb-28 md:pb-12 border-t border-[#363430]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Frame 14-279: Login Split Section */}
        <div className="bg-[#2B2824] border border-[#3A3732] p-8 md:p-12 mb-16 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Side: Editorial Prompt */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1F1E1B] border border-[#3A3732] rounded-full text-xs font-mono text-[#C85A32]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-pulse"></span>
              <span>IDENTITY & SECURITY GATEWAY</span>
            </div>
            
            <h3 className="font-serif text-3xl sm:text-5xl font-normal text-white leading-tight">
              Make room for <br />
              <span className="italic text-[#C85A32]">better</span> finds.
            </h3>
            
            <p className="font-sans text-sm text-[#A5A096] font-light leading-relaxed max-w-md">
              Sign in to manage your saved archives, track physical escrow deliveries in real time, or list vintage goods across Adama.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onAccountClick}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#229ED9] text-white font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#1D82B2] transition-colors rounded-xl shadow-xs"
              >
                <Send className="w-4 h-4" /> 
                <span>Telegram Bot Auth</span>
              </button>

              <button
                onClick={onAccountClick}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#363430] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#45423C] transition-colors rounded-xl"
              >
                <User className="w-4 h-4 text-[#C85A32]" />
                <span>Account Hub</span>
              </button>
            </div>
          </div>

          {/* Right Side: Google & Identity Portal */}
          <div className="lg:col-span-6 bg-[#1F1E1B] p-7 border border-[#3A3732] rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#3A3732] pb-3">
              <span className="font-serif text-xl font-medium text-white">
                {isAuthenticated && currentUser ? 'Active Account Session' : 'Sign In to ገልጋይ (Gelgay)'}
              </span>
              <span className="font-mono text-xs text-[#EB5B00] font-semibold">100% ESCROW</span>
            </div>

            {authMsg ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authMsg}</span>
              </div>
            ) : null}

            {isAuthenticated && currentUser ? (
              <div className="p-5 bg-[#2B2824] border border-[#3A3732] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF3F0] text-[#EB5B00] font-serif font-bold text-base flex items-center justify-center">
                      {currentUser.displayName ? currentUser.displayName[0] : (currentUser.telegramUsername ? currentUser.telegramUsername[0].toUpperCase() : 'U')}
                    </div>
                    <div>
                      <p className="font-serif text-base font-bold text-white">
                        {currentUser.displayName || (currentUser.telegramUsername ? `@${currentUser.telegramUsername}` : 'Verified User')}
                      </p>
                      <p className="font-mono text-xs text-[#A5A096]">
                        {currentUser.email || (currentUser.telegramUsername ? `@${currentUser.telegramUsername}` : 'Verified ID')}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1F1E1B] text-[#FAF8F5] rounded-full font-mono text-[10px] uppercase font-bold tracking-wider">
                    {currentUser.role || 'BUYER'}
                  </span>
                </div>

                <button
                  onClick={onAccountClick}
                  className="w-full py-3 bg-[#EB5B00] hover:bg-[#FF6B10] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <User className="w-4 h-4" />
                  <span>Open Account & Orders Menu</span>
                </button>
              </div>
            ) : (
              <>
                {/* Google OAuth Button */}
                <button
                  onClick={handleGoogleAuth}
                  disabled={busy}
                  className="w-full py-3.5 bg-white text-[#1F1E1B] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#EFECE6] transition-all flex items-center justify-center gap-3 rounded-xl shadow-xs"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                  </svg>
                  <span>Continue with Google (OAuth 2.0)</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-[#363430] flex-1" />
                  <span className="font-mono text-[10px] uppercase text-[#706C64]">or access account</span>
                  <div className="h-px bg-[#363430] flex-1" />
                </div>

                <button
                  onClick={onAccountClick}
                  className="w-full py-3 bg-[#2B2824] hover:bg-[#363430] text-[#FAF8F5] border border-[#3A3732] rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-[#229ED9]" />
                  <span>Sign in via Telegram Bot (@PaleoMarketBot)</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* Frame 14-304: Minimalist Editorial Footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-14 border-b border-[#363430] font-sans text-sm">
          
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4">
            <Link href="/" className="inline-block group">
              <img
                src="/assets/gelgay_logo_lockup_dark.png"
                alt="ገልጋይ (Gelgay)"
                style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <p className="text-xs text-[#A5A096] font-light leading-relaxed">
              <strong className="text-white">ገልጋይ (Gelgay)</strong> · <em>Good things deserve second life.</em> Curated sanctuary of timeless objects, vintage electronics, studio archives, and pre-owned treasures across Ethiopia.
            </p>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-white mb-4 font-semibold">
              Archive Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A5A096] font-light">
              <li><Link href="/shop" className="hover:text-white transition-colors">Everyday Carry (Electronics)</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Home Archive (Furniture)</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Creative Tools (Studio Gear)</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Archival Wear (Fashion)</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Paper Archive (Books & Prints)</Link></li>
            </ul>
          </div>

          {/* Col 3: Escrow & Guarantee */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-white mb-4 font-semibold">
              Buyer Protection
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A5A096] font-light">
              <li><Link href="/buyer-protection" className="hover:text-white transition-colors">100% Escrow Hold Protocol</Link></li>
              <li><Link href="/buyer-protection" className="hover:text-white transition-colors">Courier Physical Inspection</Link></li>
              <li><Link href="/buyer-protection" className="hover:text-white transition-colors">48-Hour Approval Window</Link></li>
              <li><Link href="/testimonials" className="hover:text-white transition-colors">The ገልጋይ Ledger & Reviews</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          {/* Col 4: Adama Operations */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-white mb-4 font-semibold">
              Adama Operations
            </h4>
            <p className="text-xs text-[#A5A096] font-light leading-relaxed mb-4">
              Daily handoffs and courier dispatches in Posta Bet, Geda, Boku Shenen, Daka Adu, and Goro ASTU.
            </p>
            <ul className="space-y-2.5 text-xs text-[#A5A096] font-light">
              <li>
                <Link href="/buyer-protection" className="hover:text-white transition-colors">
                  100% Escrow Protection Protocol
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Adama Neighborhood Handoffs
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onAccountClick}
                  className="text-left hover:text-white transition-colors text-xs text-[#A5A096] font-light"
                >
                  Seller &amp; Curator Verification
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Metadata */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-[#858076]">
          <div>
            © 2026 ገልጋይ (Gelgay) Marketplace. Good things deserve second life. All rights reserved. Adama, Ethiopia.
          </div>

          <div className="text-[#625D54]">
            Curated Physical Escrow &amp; Logistics Network
          </div>
        </div>

      </div>
    </footer>
  );
}

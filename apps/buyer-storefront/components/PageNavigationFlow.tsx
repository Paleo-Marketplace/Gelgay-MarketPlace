'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronRight, Compass } from 'lucide-react';

export interface PageBreadcrumb {
  label: string;
  href?: string;
}

export interface NavigationLink {
  label: string;
  sublabel?: string;
  href: string;
}

interface PageNavigationFlowProps {
  breadcrumbs?: PageBreadcrumb[];
  prev?: NavigationLink;
  next?: NavigationLink;
  currentSection?: string;
}

export default function PageNavigationFlow({
  breadcrumbs = [],
  prev,
  next,
  currentSection
}: PageNavigationFlowProps) {
  return (
    <div className="w-full bg-[#FAF8F5] border-t border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Breadcrumb Bar */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 font-mono text-xs text-[#7C776E] mb-6 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#EB5B00] transition-colors font-semibold">
              ገልጋይ (Gelgay)
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-[#A5A096]" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#C85A32] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#1F1E1B] font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Inter-page Prev / Next Flow Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prev ? (
            <Link
              href={prev.href}
              className="group p-6 bg-white/85 backdrop-blur-md border border-white/70 rounded-3xl hover:border-[#C85A32]/60 hover:bg-white/95 hover:shadow-xl transition-all duration-300 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="w-10 h-10 rounded-full bg-[#EFECE6] flex items-center justify-center text-[#1F1E1B] group-hover:bg-[#1F1E1B] group-hover:text-white transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#7C776E] block font-medium">
                  &larr; Previous Page
                </span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1F1E1B] group-hover:text-[#C85A32] transition-colors truncate block">
                  {prev.label}
                </span>
                {prev.sublabel && (
                  <span className="font-sans text-xs text-[#625D54] font-light truncate block">
                    {prev.sublabel}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}

          {next && (
            <Link
              href={next.href}
              className="group p-6 bg-white/85 backdrop-blur-md border border-white/70 rounded-3xl hover:border-[#C85A32]/60 hover:bg-white/95 hover:shadow-xl transition-all duration-300 flex items-center justify-between gap-4 text-right shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="min-w-0 text-left sm:text-right flex-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#C85A32] block font-semibold">
                  Next Destination &rarr;
                </span>
                <span className="font-serif text-base sm:text-lg font-bold text-[#1F1E1B] group-hover:text-[#C85A32] transition-colors truncate block">
                  {next.label}
                </span>
                {next.sublabel && (
                  <span className="font-sans text-xs text-[#625D54] font-light truncate block">
                    {next.sublabel}
                  </span>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-[#EFECE6] flex items-center justify-center text-[#1F1E1B] group-hover:bg-[#C85A32] group-hover:text-white transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

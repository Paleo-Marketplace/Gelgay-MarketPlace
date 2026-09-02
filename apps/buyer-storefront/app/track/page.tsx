import { Suspense } from 'react';
import TrackingPortalClient from './TrackingPortalClient';

export const metadata = {
  title: 'Track Order & Shipment | ገልጋይ (Gelgay) Marketplace',
  description: 'Track your ገልጋይ curated order, live courier GPS location, and escrow status in real-time.'
};

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] pt-32 pb-20 flex items-center justify-center font-mono text-sm text-[#7C776E]">
          Loading Live Tracking Portal...
        </div>
      }
    >
      <TrackingPortalClient />
    </Suspense>
  );
}

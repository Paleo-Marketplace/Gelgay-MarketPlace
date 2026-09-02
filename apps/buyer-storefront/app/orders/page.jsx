import OrdersClient from '../../components/OrdersClient';

export const metadata = {
  title: 'Order Tracking & Escrow Ledger | ገልጋይ (Gelgay) Marketplace',
  description: 'Track your ገልጋይ orders, active escrow holds, and live courier dispatches in real-time across Ethiopia.'
};

export default function OrdersPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return <OrdersClient apiUrl={apiUrl} />;
}

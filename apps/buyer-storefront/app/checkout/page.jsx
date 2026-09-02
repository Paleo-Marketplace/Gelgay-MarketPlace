import CheckoutClient from '../../components/CheckoutClient';

export default function CheckoutPage() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return <CheckoutClient apiUrl={apiUrl} />;
}

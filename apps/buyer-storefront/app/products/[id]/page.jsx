import { notFound } from 'next/navigation';
import ProductDetailClient from '../../../components/ProductDetailClient';

async function getProduct(id, apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/api/products/${id}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.product) return data.product;
    }
  } catch (err) {
    return null;
  }
  return null;
}

export default async function ProductPage({ params }) {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const product = await getProduct(params.id, apiUrl);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} apiUrl={apiUrl} />;
}

import { Suspense } from 'react';
import ShopBrowseClient from '../../components/ShopBrowseClient';

async function fetchProducts(apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/api/products`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch (err) {
    return [];
  }
}

export default async function ShopPage() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const initialProducts = await fetchProducts(apiUrl);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center font-mono text-sm text-[#7C776E]">
        Loading ገልጋይ Archives...
      </div>
    }>
      <ShopBrowseClient initialProducts={initialProducts} apiUrl={apiUrl} />
    </Suspense>
  );
}

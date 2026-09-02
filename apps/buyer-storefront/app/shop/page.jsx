import { Suspense } from 'react';
import ShopBrowseClient from '../../components/ShopBrowseClient';
import { PRODUCTS } from '../../data/paleoData';

async function fetchProducts(apiUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${apiUrl}/api/products`, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return PRODUCTS;
    const data = await res.json();
    return (Array.isArray(data.products) && data.products.length > 0) ? data.products : PRODUCTS;
  } catch (err) {
    return PRODUCTS;
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

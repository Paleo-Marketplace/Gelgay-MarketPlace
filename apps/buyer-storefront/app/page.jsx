import StorefrontClient from './storefront-client';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getProducts() {
  try {
    const response = await fetch(`${API_URL}/api/products`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch (error) {
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();
  return <StorefrontClient initialProducts={products} apiUrl={API_URL} />;
}

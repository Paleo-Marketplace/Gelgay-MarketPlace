import StorefrontClient from './storefront-client';
import { PRODUCTS } from '../data/paleoData';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getProducts() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${API_URL}/api/products`, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return PRODUCTS;
    const data = await response.json();
    return Array.isArray(data.products) && data.products.length > 0 ? data.products : PRODUCTS;
  } catch (error) {
    return PRODUCTS;
  }
}

export default async function HomePage() {
  const products = await getProducts();
  return <StorefrontClient initialProducts={products} apiUrl={API_URL} />;
}

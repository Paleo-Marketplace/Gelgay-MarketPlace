import StorefrontClient from '../../storefront-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getVendorProducts(id) {
  try {
    const response = await fetch(`${API_URL}/api/products?vendorId=${id}`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    return [];
  }
}

export default async function VendorPage({ params }) {
  const products = await getVendorProducts(params.id);
  return <StorefrontClient initialProducts={products} apiUrl={API_URL} />;
}

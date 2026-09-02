export const getBaseApiUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.__API_URL__) return window.__API_URL__;
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const configured = import.meta.env.VITE_API_URL;
      if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
        return configured.replace(/\/+$/, '');
      }
      return 'https://gelgay-api.onrender.com';
    }
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
};

const API_URL = getBaseApiUrl();

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

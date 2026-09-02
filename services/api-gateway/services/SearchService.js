const fetch = require('node-fetch');
const Product = require('../models/Product');

const escapeRegex = (string) => {
  return typeof string === 'string' ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
};

class SearchService {
  static async searchProducts(query = {}) {
    const rawQ = query.q || query.search || '*';
    const cleanQ = typeof rawQ === 'string' ? rawQ.trim() : '*';
    const limit = Math.max(1, Math.min(100, Number(query.limit || 24)));
    const page = Math.max(1, Number(query.page || 1));
    const host = process.env.TYPESENSE_HOST;
    const apiKey = process.env.TYPESENSE_API_KEY;

    if (host && apiKey) {
      try {
        const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
        const port = process.env.TYPESENSE_PORT || '8108';
        const params = new URLSearchParams({
          q: cleanQ,
          query_by: 'title,description,category',
          per_page: String(limit),
          page: String(page)
        });
        if (query.category) params.append('filter_by', `category:=${query.category}`);

        const response = await fetch(`${protocol}://${host}:${port}/collections/products/documents/search?${params.toString()}`, {
          headers: { 'X-TYPESENSE-API-KEY': apiKey },
          timeout: Number(process.env.TYPESENSE_TIMEOUT_MS || 6000)
        });
        if (!response.ok) {
          throw new Error(`Typesense returned HTTP ${response.status}`);
        }
        const data = await response.json();
        return {
          provider: 'typesense',
          products: (data.hits || []).map((hit) => hit.document),
          found: data.found || 0
        };
      } catch (error) {
        console.warn('[Typesense] search fallback:', error.message);
      }
    }

    const safePattern = cleanQ !== '*' ? escapeRegex(cleanQ) : null;
    const mongoQuery = {
      isPublished: true,
      stock: { $gt: 0 },
      isArchived: { $ne: true },
      ...(safePattern
        ? {
            $or: [
              { title: { $regex: safePattern, $options: 'i' } },
              { description: { $regex: safePattern, $options: 'i' } },
              { category: { $regex: safePattern, $options: 'i' } }
            ]
          }
        : {})
    };

    if (query.category && query.category !== 'All') {
      mongoQuery.category = { $regex: escapeRegex(query.category), $options: 'i' };
    }
    if (query.vendorId) {
      mongoQuery.vendorId = query.vendorId;
    }

    const [products, found] = await Promise.all([
      Product.find(mongoQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('vendorId'),
      Product.countDocuments(mongoQuery)
    ]);

    return {
      provider: 'mongodb',
      products,
      found,
      page,
      limit
    };
  }
}

module.exports = SearchService;

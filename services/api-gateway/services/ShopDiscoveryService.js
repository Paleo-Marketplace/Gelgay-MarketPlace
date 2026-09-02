const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

/**
 * Calculates Great-Circle Distance between two coordinates in kilometers using Haversine formula.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place (e.g. 1.4 km)
}

/**
 * Computes an intelligent multi-factor ranking score for a shop based on rating, distance, category fit, and reliability.
 */
function computeShopScore({ ratingAvg = 4.5, reviewCount = 10, distanceKm = 5, categoryMatch = false, isOpen = true }) {
  // 1. Rating component: 0 - 50 points (e.g. 4.9 -> 49 pts)
  const ratingScore = Math.min(50, ratingAvg * 10);

  // 2. Distance penalty/reward: 0 - 30 points (Closer gets higher score)
  const distanceScore = Math.max(0, 30 - Math.min(distanceKm, 30));

  // 3. Category relevance boost: 20 points if matching target category
  const categoryScore = categoryMatch ? 20 : 0;

  // 4. Social proof / Review volume: 0 - 10 points
  const reviewScore = Math.min(10, Math.log2(reviewCount + 1) * 2);

  // 5. Active availability boost: 10 points if open now
  const openScore = isOpen ? 10 : 0;

  return Math.round((ratingScore + distanceScore + categoryScore + reviewScore + openScore) * 10) / 10;
}

/**
 * Estimates courier delivery fee & transit time in minutes based on distance in Addis Ababa.
 */
function estimateCourierDelivery(distanceKm) {
  // Base 15 mins + 3 mins per km
  const etaMinutes = Math.max(15, Math.round(15 + distanceKm * 3.2));
  // Standard delivery fee: 50 ETB base + 15 ETB per km
  const feeETB = Math.max(50, Math.round(50 + distanceKm * 15));

  let speedBadge = 'Fast Courier (30-45 min)';
  if (etaMinutes <= 25) speedBadge = '⚡ Lightning Delivery (~20 min)';
  else if (etaMinutes <= 45) speedBadge = '🛵 Express Courier (~35 min)';
  else speedBadge = '📦 Same-Day Dispatch';

  return { etaMinutes, feeETB, speedBadge };
}

class ShopDiscoveryService {
  /**
   * Discovers and ranks shops near a buyer's GPS coordinates with category filtering & radius pruning.
   */
  static async findNearbyShops({
    userLat = 8.5400,
    userLng = 39.2680,
    category = 'All',
    maxDistanceKm = 50,
    sortBy = 'recommended', // 'recommended' | 'distance' | 'rating' | 'fastest_delivery'
    search = '',
    openOnly = false
  }) {
    const lat = Number(userLat) || 8.5400;
    const lng = Number(userLng) || 39.2680;
    const radius = Number(maxDistanceKm) || 50;

    // Fetch approved vendors
    const vendors = await Vendor.find({ kycStatus: 'approved' }).lean();

    if (!vendors || vendors.length === 0) {
      return { success: true, count: 0, shops: [], userLocation: { lat, lng } };
    }

    const vendorIds = vendors.map((v) => v._id);
    const products = await Product.find({
      vendorId: { $in: vendorIds },
      stock: { $gt: 0 },
      isArchived: { $ne: true },
      isPublished: true
    }).lean();

    // Map products to vendor ID
    const vendorProductMap = {};
    products.forEach((p) => {
      const vId = p.vendorId.toString();
      if (!vendorProductMap[vId]) vendorProductMap[vId] = [];
      vendorProductMap[vId].push(p);
    });

    const enrichedShops = [];

    for (const vendor of vendors) {
      const vendorCoords = vendor.location?.coordinates || [38.7578, 9.0100];
      const vendorLng = vendorCoords[0];
      const vendorLat = vendorCoords[1];

      const distanceKm = calculateDistanceKm(lat, lng, vendorLat, vendorLng);

      // Filter by radius
      if (radius > 0 && distanceKm > radius) {
        continue;
      }

      // Filter by open status if requested
      if (openOnly && !vendor.isOpen) {
        continue;
      }

      const shopProducts = vendorProductMap[vendor._id.toString()] || [];
      const shopCategories = vendor.categories && vendor.categories.length > 0
        ? vendor.categories
        : [...new Set(shopProducts.map((p) => p.category))];

      // Check category match
      let isCategoryMatch = false;
      if (!category || category === 'All') {
        isCategoryMatch = true;
      } else {
        const catNorm = category.toLowerCase();
        isCategoryMatch = shopCategories.some((c) => c.toLowerCase().includes(catNorm)) ||
          shopProducts.some((p) => p.category?.toLowerCase().includes(catNorm));
      }

      if (!isCategoryMatch && category !== 'All') {
        continue;
      }

      // Check text search
      if (search && search.trim()) {
        const queryNorm = search.toLowerCase().trim();
        const nameMatch = vendor.storeName?.toLowerCase().includes(queryNorm);
        const bioMatch = vendor.storeBio?.toLowerCase().includes(queryNorm);
        const addrMatch = vendor.address?.toLowerCase().includes(queryNorm);
        const prodMatch = shopProducts.some((p) => p.title?.toLowerCase().includes(queryNorm));

        if (!nameMatch && !bioMatch && !addrMatch && !prodMatch) {
          continue;
        }
      }

      const ratingAvg = vendor.rating?.average || 4.9;
      const reviewCount = vendor.rating?.count || 48;
      const score = computeShopScore({
        ratingAvg,
        reviewCount,
        distanceKm,
        categoryMatch: isCategoryMatch,
        isOpen: vendor.isOpen !== false
      });

      const courierInfo = estimateCourierDelivery(distanceKm);

      enrichedShops.push({
        id: vendor._id.toString(),
        storeName: vendor.storeName,
        storeBio: vendor.storeBio || 'Authentic curated objects & heritage design.',
        storeLogo: vendor.storeLogo || null,
        address: vendor.address || 'Addis Ababa, Ethiopia',
        coordinates: [vendorLng, vendorLat],
        distanceKm,
        rating: ratingAvg,
        reviewCount,
        isOpen: vendor.isOpen !== false,
        openingHours: vendor.openingHours || '09:00 AM - 08:00 PM',
        categories: shopCategories,
        pickupAvailable: vendor.pickupAvailable !== false,
        deliveryAvailable: vendor.deliveryAvailable !== false,
        phone: vendor.phone || '+251 91 188 4729',
        score,
        courier: courierInfo,
        productCount: shopProducts.length,
        featuredProducts: shopProducts.slice(0, 4).map((p) => ({
          id: p._id.toString(),
          title: p.title,
          price: p.price,
          category: p.category,
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
          stock: p.stock
        }))
      });
    }

    // If no shops matched the strict radius and no search text was specified, fallback to show nearest studios
    let isRadiusRelaxed = false;
    if (enrichedShops.length === 0 && (!search || !search.trim())) {
      isRadiusRelaxed = true;
      for (const vendor of vendors) {
        const vendorCoords = vendor.location?.coordinates || [38.7578, 9.0100];
        const vendorLng = vendorCoords[0];
        const vendorLat = vendorCoords[1];
        const distanceKm = calculateDistanceKm(lat, lng, vendorLat, vendorLng);
        const shopProducts = vendorProductMap[vendor._id.toString()] || [];
        const shopCategories = vendor.categories && vendor.categories.length > 0
          ? vendor.categories
          : [...new Set(shopProducts.map((p) => p.category))];

        let isCategoryMatch = !category || category === 'All';
        if (!isCategoryMatch) {
          const catNorm = category.toLowerCase();
          isCategoryMatch = shopCategories.some((c) => c.toLowerCase().includes(catNorm)) ||
            shopProducts.some((p) => p.category?.toLowerCase().includes(catNorm));
        }
        if (!isCategoryMatch && category !== 'All') continue;

        const ratingAvg = vendor.rating?.average || 4.9;
        const reviewCount = vendor.rating?.count || 48;
        const score = computeShopScore({
          ratingAvg,
          reviewCount,
          distanceKm,
          categoryMatch: isCategoryMatch,
          isOpen: vendor.isOpen !== false
        });
        const courierInfo = estimateCourierDelivery(distanceKm);

        enrichedShops.push({
          id: vendor._id.toString(),
          storeName: vendor.storeName,
          storeBio: vendor.storeBio || 'Authentic curated objects & heritage design.',
          storeLogo: vendor.storeLogo || null,
          address: vendor.address || 'Addis Ababa, Ethiopia',
          coordinates: [vendorLng, vendorLat],
          distanceKm,
          rating: ratingAvg,
          reviewCount,
          isOpen: vendor.isOpen !== false,
          openingHours: vendor.openingHours || '09:00 AM - 08:00 PM',
          categories: shopCategories,
          pickupAvailable: vendor.pickupAvailable !== false,
          deliveryAvailable: vendor.deliveryAvailable !== false,
          phone: vendor.phone || '+251 91 188 4729',
          score,
          courier: courierInfo,
          productCount: shopProducts.length,
          featuredProducts: shopProducts.slice(0, 4).map((p) => ({
            id: p._id.toString(),
            title: p.title,
            price: p.price,
            category: p.category,
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
            stock: p.stock
          }))
        });
      }
    }

    // Sort according to user preference
    if (sortBy === 'distance') {
      enrichedShops.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'rating') {
      enrichedShops.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'fastest_delivery') {
      enrichedShops.sort((a, b) => a.courier.etaMinutes - b.courier.etaMinutes);
    } else {
      // Default: Recommended by multi-factor score
      enrichedShops.sort((a, b) => b.score - a.score);
    }

    return {
      success: true,
      count: enrichedShops.length,
      userLocation: { lat, lng },
      radiusKm: radius,
      category,
      sortBy,
      isRadiusRelaxed,
      shops: enrichedShops
    };
  }

  /**
   * Searches for specific products in shops near the buyer's coordinates.
   */
  static async findNearbyProducts({
    userLat = 9.0100,
    userLng = 38.7578,
    searchQuery = '',
    category = 'All',
    maxDistanceKm = 50
  }) {
    const lat = Number(userLat) || 9.0100;
    const lng = Number(userLng) || 38.7578;
    const radius = Number(maxDistanceKm) || 50;

    const queryFilter = {
      stock: { $gt: 0 },
      isArchived: { $ne: true },
      isPublished: true
    };
    if (category && category !== 'All') {
      queryFilter.category = new RegExp(category, 'i');
    }
    if (searchQuery && searchQuery.trim()) {
      queryFilter.$or = [
        { title: new RegExp(searchQuery.trim(), 'i') },
        { description: new RegExp(searchQuery.trim(), 'i') },
        { tags: new RegExp(searchQuery.trim(), 'i') }
      ];
    }

    const products = await Product.find(queryFilter)
      .populate('vendorId', 'storeName address location rating phone isOpen')
      .lean();

    const results = [];

    for (const product of products) {
      if (!product.vendorId) continue;
      const v = product.vendorId;
      const vCoords = v.location?.coordinates || [38.7578, 9.0100];
      const distanceKm = calculateDistanceKm(lat, lng, vCoords[1], vCoords[0]);

      if (radius > 0 && distanceKm > radius) {
        continue;
      }

      const courier = estimateCourierDelivery(distanceKm);

      results.push({
        id: product._id.toString(),
        title: product.title,
        price: product.price,
        category: product.category,
        stock: product.stock,
        image: product.images?.[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
        distanceKm,
        shop: {
          id: v._id.toString(),
          name: v.storeName,
          address: v.address,
          rating: v.rating?.average || 4.9,
          isOpen: v.isOpen !== false,
          phone: v.phone || '+251 91 188 4729',
          coordinates: vCoords
        },
        courier
      });
    }

    // Sort products by distance
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      success: true,
      count: results.length,
      userLocation: { lat, lng },
      searchQuery,
      products: results
    };
  }

  static calculateDistanceKm(lat1, lon1, lat2, lon2) {
    return calculateDistanceKm(lat1, lon1, lat2, lon2);
  }

  static computeShopScore(params) {
    return computeShopScore(params);
  }

  static estimateCourierDelivery(distanceKm) {
    return estimateCourierDelivery(distanceKm);
  }
}

module.exports = ShopDiscoveryService;

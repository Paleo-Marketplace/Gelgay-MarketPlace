const express = require('express');
const ShopDiscoveryService = require('../services/ShopDiscoveryService');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

const router = express.Router();

/**
 * GET /api/shops/nearby
 * Discovers nearby shops ranked by multi-factor score (Rating + Distance + Category + Open status)
 */
router.get('/nearby', async (req, res) => {
  try {
    const {
      lat = 9.0100,
      lng = 38.7578,
      category = 'All',
      maxDistance = 50,
      radius = 50,
      sortBy = 'recommended',
      search = '',
      openOnly = 'false'
    } = req.query;

    const result = await ShopDiscoveryService.findNearbyShops({
      userLat: parseFloat(lat),
      userLng: parseFloat(lng),
      category,
      maxDistanceKm: parseFloat(maxDistance || radius),
      sortBy,
      search,
      openOnly: openOnly === 'true'
    });

    return res.json(result);
  } catch (error) {
    console.error('[Shop Discovery Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shops/nearby-products
 * Finds specific products available in nearby shops
 */
router.get('/nearby-products', async (req, res) => {
  try {
    const {
      lat = 9.0100,
      lng = 38.7578,
      q = '',
      category = 'All',
      maxDistance = 50
    } = req.query;

    const result = await ShopDiscoveryService.findNearbyProducts({
      userLat: parseFloat(lat),
      userLng: parseFloat(lng),
      searchQuery: q,
      category,
      maxDistanceKm: parseFloat(maxDistance)
    });

    return res.json(result);
  } catch (error) {
    console.error('[Nearby Products Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shops/:id
 * Fetches a single shop's full profile and catalog
 */
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const products = await Product.find({
      vendorId: vendor._id,
      stock: { $gt: 0 },
      isArchived: { $ne: true },
      isPublished: true
    }).lean();

    return res.json({
      success: true,
      shop: {
        id: vendor._id.toString(),
        storeName: vendor.storeName,
        storeBio: vendor.storeBio,
        storeLogo: vendor.storeLogo,
        storeBanner: vendor.storeBanner,
        address: vendor.address,
        coordinates: vendor.location?.coordinates || [38.7578, 9.0100],
        rating: vendor.rating?.average || 4.9,
        reviewCount: vendor.rating?.count || 52,
        isOpen: vendor.isOpen !== false,
        openingHours: vendor.openingHours || '09:00 AM - 08:00 PM',
        categories: vendor.categories || [],
        phone: vendor.phone || '+251 91 188 4729',
        pickupAvailable: vendor.pickupAvailable !== false,
        deliveryAvailable: vendor.deliveryAvailable !== false,
        products: products.map((p) => ({
          id: p._id.toString(),
          title: p.title,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          images: p.images
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shops/route
 * Returns real-time shortest road network route (GeoJSON linestring + distance + duration)
 */
const routeCache = new Map();

router.get('/directions/path', async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;
    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ success: false, message: 'fromLat, fromLng, toLat, toLng are required' });
    }

    const fLat = parseFloat(fromLat);
    const fLng = parseFloat(fromLng);
    const tLat = parseFloat(toLat);
    const tLng = parseFloat(toLng);

    const cacheKey = `${fLat.toFixed(4)},${fLng.toFixed(4)}->${tLat.toFixed(4)},${tLng.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
      return res.json({ success: true, ...routeCache.get(cacheKey) });
    }

    // Query OSRM open routing machine for turn-by-turn road network
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=full&geometries=geojson&steps=true`;
    
    try {
      const fetchRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const summary = {
            distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
            durationMinutes: Math.ceil(route.duration / 60),
            latlngs,
            via: route.legs?.[0]?.summary || 'Road Network'
          };

          routeCache.set(cacheKey, summary);
          if (routeCache.size > 300) {
            const firstKey = routeCache.keys().next().value;
            routeCache.delete(firstKey);
          }

          return res.json({ success: true, ...summary });
        }
      }
    } catch (netErr) {
      console.warn('[OSRM Routing Network Warning]:', netErr.message);
    }

    // Fallback: Haversine distance
    const dist = ShopDiscoveryService.calculateDistance(fLat, fLng, tLat, tLng);
    const fallbackLatlngs = [
      [fLat, fLng],
      [tLat, tLng]
    ];
    return res.json({
      success: true,
      distanceKm: parseFloat(dist.toFixed(2)),
      durationMinutes: Math.max(5, Math.ceil(dist * 3)),
      latlngs: fallbackLatlngs,
      via: 'Direct'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

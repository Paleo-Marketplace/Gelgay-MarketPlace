const fetch = require('node-fetch');

const OSRM_ENDPOINT = (process.env.OSRM_ENDPOINT || process.env.OSRM_URL || 'https://router.project-osrm.org/route/v1/driving').replace(/\/$/, '');

const assertLngLat = (coordinates, label) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error(`${label} must be a GeoJSON [lng, lat] coordinate pair`);
  }

  const [lng, lat] = coordinates.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error(`${label} contains invalid coordinates`);
  }

  return [lng, lat];
};

const haversineDistanceMeters = (coord1, coord2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

class LogisticsService {
  static calculateDeliveryFee({ distanceMeters, targetDate = new Date() }) {
    const baseFee = Number(process.env.BASE_DELIVERY_FEE || 50); // 50 ETB base
    const ratePerKm = Number(process.env.DELIVERY_RATE_PER_KM || 20); // 20 ETB per km
    const distanceKm = Math.max(0.5, (distanceMeters || 1000) / 1000);

    const date = new Date(targetDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = date.getHours();

    let dayMultiplier = 1.0;
    let dayLabel = 'Standard Weekday';
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayMultiplier = 1.20; // Weekend +20%
      dayLabel = 'Weekend Surcharge (+20%)';
    } else if (dayOfWeek === 5 && hour >= 16) {
      dayMultiplier = 1.15; // Friday evening peak
      dayLabel = 'Friday Evening Peak (+15%)';
    }

    let timeMultiplier = 1.0;
    let timeLabel = 'Standard Hours';
    if ((hour >= 12 && hour < 14) || (hour >= 17 && hour < 20)) {
      timeMultiplier = 1.15; // Rush hours
      timeLabel = 'Rush Hour Peak (+15%)';
    } else if (hour >= 20 || hour < 6) {
      timeMultiplier = 1.25; // Night delivery
      timeLabel = 'Night Delivery (+25%)';
    }

    const unscaledFee = baseFee + distanceKm * ratePerKm;
    const finalFee = Math.round(unscaledFee * dayMultiplier * timeMultiplier);

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      baseFee,
      ratePerKm,
      dayMultiplier,
      dayLabel,
      timeMultiplier,
      timeLabel,
      totalDeliveryFee: finalFee
    };
  }

  static async calculateDeliveryRoute(origin, destination, options = {}) {
    const [originLng, originLat] = assertLngLat(origin, 'origin');
    const [destLng, destLat] = assertLngLat(destination, 'destination');

    // 1. Check if Mapbox API Token is configured (Managed Alternative)
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_API_KEY;
    if (mapboxToken) {
      try {
        const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&access_token=${mapboxToken}`;
        const mbRes = await fetch(mapboxUrl, { timeout: Number(process.env.MAPBOX_TIMEOUT_MS || 8000) });
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          const mbRoute = mbData.routes && mbData.routes[0];
          if (mbRoute && mbRoute.geometry) {
            const fee = this.calculateDeliveryFee({
              distanceMeters: mbRoute.distance,
              targetDate: options.targetDate || new Date()
            });
            return {
              provider: 'Mapbox',
              distanceMeters: mbRoute.distance,
              durationSeconds: mbRoute.duration,
              fee,
              geometry: {
                type: 'LineString',
                coordinates: mbRoute.geometry.coordinates
              }
            };
          }
        }
      } catch (mbErr) {
        console.warn('[Mapbox API] routing fallback to OSRM:', mbErr.message);
      }
    }

    // 2. Primary OSRM Engine (Self-hosted or Open Router)
    const url = `${OSRM_ENDPOINT}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url, { timeout: Number(process.env.OSRM_TIMEOUT_MS || 10000) });
      if (!response.ok) {
        throw new Error(`OSRM returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const route = data.routes && data.routes[0];
      if (!route || !route.geometry || !route.geometry.coordinates) {
        throw new Error('OSRM response did not include a route geometry');
      }

      const fee = this.calculateDeliveryFee({
        distanceMeters: route.distance,
        targetDate: options.targetDate || new Date()
      });

      return {
        provider: 'OSRM',
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        fee,
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates
        }
      };
    } catch (error) {
      console.warn('[OSRM] route calculation fallback:', error.message);
      const fallbackMeters = haversineDistanceMeters([originLng, originLat], [destLng, destLat]);
      const fee = this.calculateDeliveryFee({
        distanceMeters: fallbackMeters,
        targetDate: options.targetDate || new Date()
      });

      return {
        provider: 'fallback',
        distanceMeters: fallbackMeters,
        durationSeconds: Math.round((fallbackMeters / 1000 / 30) * 3600), // ~30 km/h estimated speed
        fee,
        geometry: {
          type: 'LineString',
          coordinates: [origin, destination]
        },
        error: error.message
      };
    }
  }
}

module.exports = LogisticsService;

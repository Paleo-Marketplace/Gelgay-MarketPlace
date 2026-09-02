'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  Truck,
  Layers,
  Store,
  ExternalLink,
  X,
  ChevronRight,
  Maximize2,
  Sparkles,
  Route,
  Compass,
  Zap
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Distinct, vibrant color identities for each category & shop
const CATEGORY_STYLES = {
  'Everyday Carry': {
    icon: '📻',
    color: '#E56B55', // Terracotta Coral
    glowColor: 'rgba(229, 107, 85, 0.45)',
    textColor: '#FFFFFF',
    tag: 'Audio & Everyday Carry',
    badgeBg: '#FAF0ED'
  },
  'Home Archive': {
    icon: '🪑',
    color: '#D97706', // Teak Amber
    glowColor: 'rgba(217, 119, 6, 0.45)',
    textColor: '#FFFFFF',
    tag: 'Mid-Century Teak & Furniture',
    badgeBg: '#FFFBEB'
  },
  'Creative Tools': {
    icon: '📷',
    color: '#059669', // Leica Emerald
    glowColor: 'rgba(5, 150, 105, 0.45)',
    textColor: '#FFFFFF',
    tag: 'Leica & Optical Tools',
    badgeBg: '#ECFDF5'
  },
  'Archival Wear': {
    icon: '🧥',
    color: '#3B82F6', // Denim Indigo / Sapphire
    glowColor: 'rgba(59, 130, 246, 0.45)',
    textColor: '#FFFFFF',
    tag: 'Highland Leather & Denim',
    badgeBg: '#EFF6FF'
  },
  'Paper Archive': {
    icon: '📚',
    color: '#E11D48', // Typographic Rose / Ruby
    glowColor: 'rgba(225, 29, 72, 0.45)',
    textColor: '#FFFFFF',
    tag: 'Rare Books & Monographs',
    badgeBg: '#FFF1F2'
  }
};

const DEFAULT_STYLE = {
  icon: '🏪',
  color: '#8B5CF6', // Purple Studio
  glowColor: 'rgba(139, 92, 246, 0.45)',
  textColor: '#FFFFFF',
  tag: 'Curated Studio',
  badgeBg: '#F5F3FF'
};

const MAP_LAYERS = {
  voyager: {
    name: 'Curated Warm',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  street: {
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  dark: {
    name: 'Dark Canvas',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
};

// In-memory cache for shortest road paths
const roadPathCache = new Map();

export default function NearbyShopsMap({
  userCoords = [8.5400, 39.2680], // [lat, lng] (Adama Center)
  shops = [],
  selectedShopId = null,
  onSelectShop = () => {},
  radiusKm = 50
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const radiusCircleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [activeMapLayer, setActiveMapLayer] = useState('voyager');
  const [hoveredShopId, setHoveredShopId] = useState(null);
  const [internalSelectedId, setInternalSelectedId] = useState(selectedShopId);
  const [showAllColorRoutes, setShowAllColorRoutes] = useState(true);
  const [roadRoutes, setRoadRoutes] = useState({}); // { [shopId]: { latlngs, distanceKm, durationMinutes, via } }
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Sync internal selected ID with prop
  useEffect(() => {
    setInternalSelectedId(selectedShopId);
  }, [selectedShopId]);

  // Selected shop object
  const activeShop = useMemo(() => {
    return shops.find((s) => s.id === (internalSelectedId || hoveredShopId)) || null;
  }, [shops, internalSelectedId, hoveredShopId]);

  const activeRouteInfo = useMemo(() => {
    if (!activeShop) return null;
    return roadRoutes[activeShop.id] || null;
  }, [activeShop, roadRoutes]);

  // 1. Fetch Real-Time Shortest Road Network Paths for all nearby shops
  useEffect(() => {
    if (!shops.length || !userCoords) return;

    let isMounted = true;
    const [userLat, userLng] = userCoords;

    async function fetchShortestPaths() {
      setIsRoutingLoading(true);
      const newRoutes = { ...roadRoutes };
      let hasUpdates = false;

      const fetchPromises = shops.map(async (shop) => {
        const shopLng = shop.coordinates?.[0] || 38.7578;
        const shopLat = shop.coordinates?.[1] || 9.0100;
        const cacheKey = `${userLat.toFixed(4)},${userLng.toFixed(4)}->${shopLat.toFixed(4)},${shopLng.toFixed(4)}`;

        if (roadPathCache.has(cacheKey)) {
          newRoutes[shop.id] = roadPathCache.get(cacheKey);
          hasUpdates = true;
          return;
        }

        try {
          // Query backend routing proxy
          const res = await fetch(
            `${apiUrl}/api/shops/directions/path?fromLat=${userLat}&fromLng=${userLng}&toLat=${shopLat}&toLng=${shopLng}`,
            { signal: AbortSignal.timeout(4500) }
          );

          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.latlngs) && data.latlngs.length > 0) {
              const routeInfo = {
                latlngs: data.latlngs,
                distanceKm: data.distanceKm || shop.distanceKm,
                durationMinutes: data.durationMinutes || shop.courier?.etaMinutes,
                via: data.via || 'Turn-by-turn road'
              };
              roadPathCache.set(cacheKey, routeInfo);
              newRoutes[shop.id] = routeInfo;
              hasUpdates = true;
              return;
            }
          }
        } catch (e) {
          // Direct OSRM client fallback
          try {
            const osrmRes = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`,
              { signal: AbortSignal.timeout(3500) }
            );
            if (osrmRes.ok) {
              const osrmData = await osrmRes.json();
              if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
                const route = osrmData.routes[0];
                const routeInfo = {
                  latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                  distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
                  durationMinutes: Math.ceil(route.duration / 60),
                  via: route.legs?.[0]?.summary || 'Road Network'
                };
                roadPathCache.set(cacheKey, routeInfo);
                newRoutes[shop.id] = routeInfo;
                hasUpdates = true;
                return;
              }
            }
          } catch (osrmErr) {}
        }

        // Direct interpolation fallback if offline
        const fallbackRoute = {
          latlngs: [
            [userLat, userLng],
            [shopLat, shopLng]
          ],
          distanceKm: shop.distanceKm,
          durationMinutes: shop.courier?.etaMinutes || 20,
          via: 'Direct Line'
        };
        newRoutes[shop.id] = fallbackRoute;
        hasUpdates = true;
      });

      await Promise.allSettled(fetchPromises);

      if (isMounted && hasUpdates) {
        setRoadRoutes({ ...newRoutes });
        setIsRoutingLoading(false);
      }
    }

    fetchShortestPaths();

    return () => {
      isMounted = false;
    };
  }, [shops, userCoords, apiUrl]);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current || !isMounted) return;

      try {
        const leafletModule = await import('leaflet');
        const L = leafletModule.default || leafletModule;
        if (!L || !L.map || !mapContainerRef.current || mapInstanceRef.current || !isMounted) return;

        // Fix default Leaflet icon paths
        if (L.Icon?.Default?.prototype) {
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/marker-icon-2x.png',
            iconUrl: '/marker-icon.png',
            shadowUrl: '/marker-shadow.png'
          });
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          fadeAnimation: true,
          zoomAnimation: true
        }).setView(userCoords, 13);

        mapInstanceRef.current = map;

        // Add base tile layer
        const layerConfig = MAP_LAYERS[activeMapLayer];
        const tileLayer = L.tileLayer(layerConfig.url, {
          attribution: layerConfig.attribution,
          maxZoom: 19
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        // Invalidate size after layout completes
        setTimeout(() => {
          if (mapInstanceRef.current && isMounted) {
            try {
              mapInstanceRef.current.invalidateSize();
            } catch (e) {}
          }
        }, 150);

      } catch (err) {
        console.error('[NearbyShopsMap init error]:', err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Handle Base Tile Layer Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      if (!L) return;

      map.removeLayer(tileLayerRef.current);
      const config = MAP_LAYERS[activeMapLayer];
      const newLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 19
      }).addTo(map);
      tileLayerRef.current = newLayer;
    });
  }, [activeMapLayer]);

  // 4. Render Turn-By-Turn Road Path Polylines, Place Pins, User Beacon & Badges
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      if (!L) return;

      // Clean up previous markers & route lines
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      routeLayersRef.current.forEach((layer) => map.removeLayer(layer));
      routeLayersRef.current = [];

      if (radiusCircleRef.current) {
        map.removeLayer(radiusCircleRef.current);
        radiusCircleRef.current = null;
      }

      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }

      const [userLat, userLng] = userCoords;

      // A. Discovery Radius Zone
      const circleRadiusMeters = Math.min(radiusKm * 1000, 30000);
      const radiusCircle = L.circle([userLat, userLng], {
        radius: circleRadiusMeters,
        color: '#1F1E1B',
        weight: 1.5,
        opacity: 0.25,
        dashArray: '5, 5',
        fillColor: '#1F1E1B',
        fillOpacity: 0.02
      }).addTo(map);
      radiusCircleRef.current = radiusCircle;

      // B. User GPS Beacon (Discovery Origin)
      const userIcon = L.divIcon({
        className: 'user-location-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: #1F1E1B; opacity: 0.3; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: #1F1E1B; border: 3px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.5); position: relative; z-index: 2;"></div>
            <div style="position: absolute; top: -22px; background: #1F1E1B; color: #FFFFFF; font-size: 10px; font-family: monospace; font-weight: 800; padding: 2px 7px; border-radius: 8px; border: 1.5px solid #FAF8F5; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.35); pointer-events: none;">
              📍 YOU (Origin)
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const userMarker = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>📍 Your Location (Starting Point)</b><br/><span style="font-size:11px;color:#7C776E;">Adama City Origin</span>');
      userMarkerRef.current = userMarker;

      const bounds = L.latLngBounds([[userLat, userLng]]);

      // C. Render Turn-by-Turn Road Polylines from User to Each Studio
      shops.forEach((shop) => {
        const shopLng = shop.coordinates?.[0] || 38.7578;
        const shopLat = shop.coordinates?.[1] || 9.0100;
        const isSelected = shop.id === internalSelectedId;
        const isHovered = shop.id === hoveredShopId;
        const primaryCat = shop.categories?.[0] || 'Curated';
        const style = CATEGORY_STYLES[primaryCat] || DEFAULT_STYLE;

        bounds.extend([shopLat, shopLng]);

        const routeData = roadRoutes[shop.id];
        const pathCoordinates = routeData?.latlngs || [
          [userLat, userLng],
          [shopLat, shopLng]
        ];

        const shouldDrawRoute = showAllColorRoutes || isSelected || isHovered;

        if (shouldDrawRoute) {
          // 1. If Selected: Draw Glowing Road Aura Underneath
          if (isSelected) {
            const glowPolyline = L.polyline(pathCoordinates, {
              color: style.color,
              weight: 11,
              opacity: 0.35,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
            routeLayersRef.current.push(glowPolyline);
          }

          // 2. Real-Time Shortest Street Route Line
          const polyline = L.polyline(pathCoordinates, {
            color: style.color,
            weight: isSelected ? 5.5 : isHovered ? 4.5 : 3.0,
            opacity: isSelected ? 1.0 : isHovered ? 0.95 : 0.70,
            dashArray: isSelected ? 'none' : '4, 6',
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          // 3. True Midpoint along the turn-by-turn road network
          const midIdx = Math.floor(pathCoordinates.length / 2);
          const [midLat, midLng] = pathCoordinates[midIdx] || [
            (userLat + shopLat) / 2,
            (userLng + shopLng) / 2
          ];

          const distDisplay = routeData?.distanceKm ? `${routeData.distanceKm} km` : `${shop.distanceKm} km`;
          const timeDisplay = routeData?.durationMinutes ? `${routeData.durationMinutes}m drive` : (shop.courier?.etaMinutes ? `${shop.courier.etaMinutes}m` : '');

          const midPillHtml = `
            <div style="
              background: ${isSelected ? style.color : '#FFFFFF'};
              color: ${isSelected ? '#FFFFFF' : style.color};
              border: 2px solid ${style.color};
              padding: 2px 8px;
              border-radius: 9999px;
              font-family: -apple-system, BlinkMacSystemFont, monospace;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              cursor: pointer;
              transform: translate(-50%, -50%) ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${style.icon}</span>
              <span>${distDisplay}</span>
              ${timeDisplay ? `<span style="opacity: 0.9;">· ⚡ ${timeDisplay}</span>` : ''}
            </div>
          `;

          const midMarkerIcon = L.divIcon({
            className: `route-pill-${shop.id}`,
            html: midPillHtml,
            iconSize: [100, 22],
            iconAnchor: [50, 11]
          });

          const midMarker = L.marker([midLat, midLng], {
            icon: midMarkerIcon,
            zIndexOffset: isSelected ? 700 : 200
          }).addTo(map);

          midMarker.on('click', () => {
            setInternalSelectedId(shop.id);
            onSelectShop(shop.id);
            map.flyTo([shopLat, shopLng], 14, { duration: 0.8 });
          });

          routeLayersRef.current.push(polyline, midMarker);
        }

        // D. Destination Place Pins & Floating Sign Pills
        const distanceBadgeText = routeData?.distanceKm ? `${routeData.distanceKm} km` : (shop.distanceKm ? `${shop.distanceKm} km` : 'Near');

        const pinHtml = `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.22) translateY(-6px)' : isHovered ? 'scale(1.1) translateY(-3px)' : 'scale(1)'};
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            filter: drop-shadow(0 4px 14px ${style.glowColor});
            user-select: none;
          ">
            <!-- Google Maps Sign Pill (Store Name + Real Road Distance) -->
            <div style="
              background: ${isSelected ? style.color : '#1F1E1B'};
              color: #FFFFFF;
              padding: 4px 10px;
              border-radius: 9999px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              font-weight: 700;
              border: 2px solid ${isSelected ? '#FFFFFF' : style.color};
              display: flex;
              align-items: center;
              gap: 5px;
              white-space: nowrap;
              margin-bottom: 2px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            ">
              <span style="font-size: 13px;">${style.icon}</span>
              <span>${shop.storeName.length > 18 ? shop.storeName.slice(0, 16) + '…' : shop.storeName}</span>
              
              <!-- Real-time Road Distance Tag -->
              <span style="
                background: ${isSelected ? 'rgba(0,0,0,0.25)' : style.color};
                color: #FFFFFF;
                padding: 1.5px 6px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 9.5px;
                font-weight: 800;
                border: 1px solid rgba(255,255,255,0.3);
              ">
                📍 ${distanceBadgeText}
              </span>
            </div>

            <!-- Color-Coded Teardrop Pin Marker Stem -->
            <div style="
              width: 26px;
              height: 26px;
              border-radius: 50% 50% 50% 0;
              background: ${style.color};
              transform: rotate(-45deg);
              border: 2.5px solid #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            ">
              <div style="
                width: 10px;
                height: 10px;
                background: #FFFFFF;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          </div>
        `;

        const shopIcon = L.divIcon({
          className: `custom-google-pin-${shop.id}`,
          html: pinHtml,
          iconSize: [180, 56],
          iconAnchor: [90, 52]
        });

        const marker = L.marker([shopLat, shopLng], {
          icon: shopIcon,
          zIndexOffset: isSelected ? 800 : 100
        }).addTo(map);

        marker.on('click', () => {
          setInternalSelectedId(shop.id);
          onSelectShop(shop.id);
          map.flyTo([shopLat, shopLng], 14, { duration: 0.8 });
        });

        marker.on('mouseover', () => {
          setHoveredShopId(shop.id);
        });

        marker.on('mouseout', () => {
          setHoveredShopId(null);
        });

        markersRef.current.push(marker);
      });

      // Fit map bounds if shops exist
      if (shops.length > 0) {
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
      }
    });
  }, [shops, internalSelectedId, hoveredShopId, userCoords, radiusKm, showAllColorRoutes, roadRoutes]);

  // Recenter Map to User GPS
  const handleRecenterUser = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(userCoords, 14, { duration: 0.8 });
  };

  // Fit All Pins in View
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || shops.length === 0) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      if (!L) return;

      const bounds = L.latLngBounds([userCoords]);
      shops.forEach((s) => {
        if (s.coordinates) bounds.extend([s.coordinates[1], s.coordinates[0]]);
      });
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
    });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[460px] rounded-3xl overflow-hidden border border-[#E2DDD3] shadow-md relative z-0 isolate select-none flex flex-col">
      
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] sm:min-h-[460px] relative z-0" />

      {/* Top Floating Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        
        {/* Left: Layer Switcher & Shortest Road Routes Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Base Tile Layer */}
          <div className="flex items-center gap-1 p-1 bg-[#FAF8F5]/95 backdrop-blur-md border border-[#E2DDD3] rounded-2xl shadow-md">
            {Object.entries(MAP_LAYERS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveMapLayer(key)}
                className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold transition-all ${
                  activeMapLayer === key
                    ? 'bg-[#1F1E1B] text-white shadow-xs'
                    : 'text-[#625D54] hover:text-[#1F1E1B]'
                }`}
              >
                {config.name}
              </button>
            ))}
          </div>

          {/* Shortest Road Paths Toggle */}
          <button
            onClick={() => setShowAllColorRoutes(!showAllColorRoutes)}
            className={`px-3 py-1.5 rounded-2xl font-mono text-[11px] font-bold border shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 active:scale-95 ${
              showAllColorRoutes
                ? 'bg-[#1F1E1B] text-white border-[#1F1E1B]'
                : 'bg-white/95 text-[#625D54] border-[#E2DDD3] hover:text-[#1F1E1B]'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-[#E56B55]" />
            <span>{showAllColorRoutes ? '🛣️ Road Paths: ON' : 'Road Path: Selected'}</span>
          </button>
        </div>

        {/* Right: GPS & Fit Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleRecenterUser}
            title="Recenter to My Location"
            className="p-2 bg-white/95 backdrop-blur-md hover:bg-white text-[#1F1E1B] hover:text-[#E56B55] border border-[#E2DDD3] rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <Navigation className="w-3.5 h-3.5 text-[#E56B55]" />
            <span className="hidden sm:inline">My GPS</span>
          </button>

          <button
            onClick={handleFitAll}
            title="Show All Studios"
            className="p-2 bg-white/95 backdrop-blur-md hover:bg-white text-[#1F1E1B] hover:text-[#E56B55] border border-[#E2DDD3] rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#7C776E]" />
            <span className="hidden sm:inline">All ({shops.length})</span>
          </button>
        </div>
      </div>

      {/* Right Zoom Controls */}
      <div className="absolute right-3 top-16 flex flex-col gap-1 z-20 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 bg-white/95 backdrop-blur-md hover:bg-white border border-[#E2DDD3] rounded-xl flex items-center justify-center font-bold text-sm text-[#1F1E1B] shadow-md transition-all active:scale-95"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 bg-white/95 backdrop-blur-md hover:bg-white border border-[#E2DDD3] rounded-xl flex items-center justify-center font-bold text-sm text-[#1F1E1B] shadow-md transition-all active:scale-95"
        >
          −
        </button>
      </div>

      {/* Category Color Mapping Ribbon Legend (Top Left under controls) */}
      <div className="absolute top-14 left-3 z-20 pointer-events-none hidden md:flex items-center gap-1.5 p-1 bg-[#FAF8F5]/90 backdrop-blur-md border border-[#E2DDD3] rounded-2xl shadow-sm">
        {Object.entries(CATEGORY_STYLES).map(([catName, style]) => (
          <div key={catName} className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-mono font-semibold" style={{ color: style.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }}></span>
            <span>{catName}</span>
          </div>
        ))}
      </div>

      {/* Google Maps Interactive Floating Studio Preview Sheet (Bottom Left) */}
      {activeShop && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto animate-fade-in">
          {(() => {
            const currentCat = activeShop.categories?.[0] || 'Curated';
            const style = CATEGORY_STYLES[currentCat] || DEFAULT_STYLE;
            const dist = activeRouteInfo?.distanceKm || activeShop.distanceKm;
            const duration = activeRouteInfo?.durationMinutes || activeShop.courier?.etaMinutes;
            const viaRoad = activeRouteInfo?.via || 'Adama Street Grid';

            return (
              <div 
                className="bg-[#FAF8F5]/95 backdrop-blur-xl border rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 relative text-[#1F1E1B]"
                style={{ borderColor: style.color }}
              >
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setInternalSelectedId(null);
                    setHoveredShopId(null);
                    onSelectShop(null);
                  }}
                  className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#EAE6DF] hover:bg-[#DCD6CA] flex items-center justify-center text-[#625D54] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Studio Header with Category Badge */}
                <div className="flex items-start gap-3 pr-6">
                  <div 
                    className="w-12 h-12 rounded-2xl text-white flex items-center justify-center text-xl shrink-0 shadow-md"
                    style={{ backgroundColor: style.color }}
                  >
                    {style.icon}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }} />
                      <h4 className="font-serif text-base font-bold text-[#1F1E1B] truncate">
                        {activeShop.storeName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#7C776E]">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {activeShop.rating}
                      </span>
                      <span>·</span>
                      <span>{activeShop.reviewCount} reviews</span>
                      <span>·</span>
                      <span className="font-semibold" style={{ color: style.color }}>{currentCat}</span>
                    </div>
                  </div>
                </div>

                {/* Shortest Real-World Driving Road Path Route Info */}
                <div className="p-2.5 bg-white border border-[#E8E4DC] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10.5px]">
                    <span className="flex items-center gap-1 text-[#625D54] font-semibold truncate max-w-[200px]">
                      <Compass className="w-3.5 h-3.5 shrink-0" style={{ color: style.color }} />
                      <span className="truncate">via {viaRoad}</span>
                    </span>
                    <span className="text-emerald-700 font-bold shrink-0">
                      ⚡ Shortest Path
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0ECE1]">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold"
                        style={{ backgroundColor: style.badgeBg, color: style.color }}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold" style={{ color: style.color }}>
                          {dist} km road
                        </div>
                        <div className="font-sans text-[9.5px] text-[#7C776E]">From your location</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-l border-[#E8E4DC] pl-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-emerald-800">
                          ~{duration} min drive
                        </div>
                        <div className="font-sans text-[9.5px] text-[#7C776E]">{activeShop.courier?.feeETB} ETB Delivery</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address & Hours */}
                <div className="space-y-1 text-xs font-sans text-[#625D54]">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 text-[#7C776E] shrink-0" />
                    <span className="truncate">{activeShop.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-semibold">
                    <Clock className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>Open: {activeShop.openingHours}</span>
                  </div>
                </div>

                {/* In-Stock Preview Chips */}
                {activeShop.featuredProducts && activeShop.featuredProducts.length > 0 && (
                  <div className="pt-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {activeShop.featuredProducts.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#E8E4DC] rounded-xl shrink-0 text-xs font-sans shadow-2xs"
                      >
                        <img src={p.image} alt={p.title} className="w-6 h-6 object-cover rounded-lg" />
                        <span className="font-semibold text-[#1F1E1B] truncate max-w-[120px]">{p.title}</span>
                        <span className="font-mono text-[10px] font-bold" style={{ color: style.color }}>{p.price} ETB</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#E8E4DC]">
                  <Link
                    href={`/vendors/${activeShop.id}`}
                    className="grow py-2 px-4 text-white rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 shadow-xs"
                    style={{ backgroundColor: style.color }}
                  >
                    <span>Visit Studio Storefront</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}

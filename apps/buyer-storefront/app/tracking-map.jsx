'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Clock, DollarSign, MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function TrackingMap({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  vendorOrderId,
  masterOrderId,
  vendorCoords = [38.75, 9.06],
  buyerCoords = [38.762, 9.012]
}) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [liveGps, setLiveGps] = useState(null);

  // Stabilize coordinate values against inline array recreation
  const vLng = vendorCoords?.[0] ?? 38.75;
  const vLat = vendorCoords?.[1] ?? 9.06;
  const bLng = buyerCoords?.[0] ?? 38.762;
  const bLat = buyerCoords?.[1] ?? 9.012;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!nodeRef.current || mapRef.current || !isMounted) return;

      try {
        const leafletModule = await import('leaflet');
        const L = leafletModule.default || leafletModule;
        if (!L || !L.map || !nodeRef.current || mapRef.current || !isMounted) return;

        // Fix default Leaflet marker assets
        if (L.Icon?.Default?.prototype) {
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/marker-icon-2x.png',
            iconUrl: '/marker-icon.png',
            shadowUrl: '/marker-shadow.png'
          });
        }

        const map = L.map(nodeRef.current, {
          zoomControl: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false
        }).setView([bLat, bLng], 12);

        mapRef.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19
        }).addTo(map);

        setTimeout(() => {
          if (mapRef.current && isMounted) {
            try {
              mapRef.current.invalidateSize();
            } catch (e) {}
          }
        }, 200);

        const vendorLatLng = [vLat, vLng];
        const buyerLatLng = [bLat, bLng];

        const createPinIcon = (color, label) => {
          return L.divIcon({
            className: 'custom-leaflet-pin',
            html: `<div style="background:${color};color:#fff;padding:4px 8px;border-radius:12px;font-size:10px;font-family:monospace;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;display:flex;align-items:center;gap:4px;border:1.5px solid #fff;">
              <span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>
              ${label}
            </div>`,
            iconSize: [80, 24],
            iconAnchor: [40, 12]
          });
        };

        L.marker(vendorLatLng, { icon: createPinIcon('#C85A32', 'Vendor Pickup') })
          .bindPopup('<strong>Vendor Warehouse</strong><br>Bole District, Addis Ababa')
          .addTo(map);

        L.marker(buyerLatLng, { icon: createPinIcon('#1F1E1B', 'Buyer Delivery') })
          .bindPopup('<strong>Buyer Destination</strong><br>Delivery Address')
          .addTo(map);

        const courierIcon = L.divIcon({
          className: 'custom-courier-pin',
          html: `<div style="background:#059669;color:#fff;padding:5px 9px;border-radius:14px;font-size:11px;font-family:monospace;font-weight:bold;box-shadow:0 0 10px rgba(5,150,105,0.6);white-space:nowrap;display:flex;align-items:center;gap:5px;border:2px solid #fff;animation:pulse 2s infinite;">
            <span style="width:7px;height:7px;border-radius:50%;background:#34d399;"></span>
            Courier Live
          </div>`,
          iconSize: [95, 26],
          iconAnchor: [47, 13]
        });

        courierMarkerRef.current = L.marker(vendorLatLng, { icon: courierIcon }).addTo(map);

        // Dynamic OSRM Route Calculation
        try {
          const query = `originLng=${vLng}&originLat=${vLat}&destinationLng=${bLng}&destinationLat=${bLat}`;
          const res = await fetch(`${apiUrl}/api/logistics/route?${query}`).catch(() => null);
          const data = await res?.json().catch(() => ({}));

          if (data?.success && data?.route && isMounted) {
            setRouteInfo(data.route);
            if (data.route.geometry?.coordinates) {
              const latLngs = data.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
              if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
              routeLayerRef.current = L.polyline(latLngs, { color: '#ef4444', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
              map.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30], animate: false });
            }
          } else if (isMounted) {
            routeLayerRef.current = L.polyline([vendorLatLng, buyerLatLng], { color: '#ef4444', weight: 5, opacity: 0.95, dashArray: '6, 6' }).addTo(map);
            map.fitBounds([vendorLatLng, buyerLatLng], { padding: [24, 24], animate: false });
          }
        } catch (err) {
          if (isMounted) {
            routeLayerRef.current = L.polyline([vendorLatLng, buyerLatLng], { color: '#ef4444', weight: 5, opacity: 0.95, dashArray: '6, 6' }).addTo(map);
            map.fitBounds([vendorLatLng, buyerLatLng], { padding: [24, 24], animate: false });
          }
        }
      } catch (e) {
        // Fallback for SSR/dynamic import
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [vLng, vLat, bLng, bLat, apiUrl]);

  // 2. Controlled Socket.io Connection
  useEffect(() => {
    if (!apiUrl) return;

    let activeSocket = null;
    let isCancelled = false;

    try {
      activeSocket = io(apiUrl, {
        withCredentials: true,
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        timeout: 10000
      });

      if (vendorOrderId || masterOrderId) {
        activeSocket.emit('order:join', { vendorOrderId, masterOrderId });
      }

      activeSocket.on('courier:gps:update', (update) => {
        if (isCancelled || !update?.coordinates) return;
        const [lng, lat] = update.coordinates;
        setLiveGps(update);
        if (courierMarkerRef.current) {
          courierMarkerRef.current.setLatLng([lat, lng]);
        }
      });
    } catch (err) {}

    return () => {
      isCancelled = true;
      if (activeSocket) {
        activeSocket.off('courier:gps:update');
        activeSocket.disconnect();
      }
    };
  }, [apiUrl, vendorOrderId, masterOrderId]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2DDD3', zIndex: 0, isolation: 'isolate' }}>
      <div className="map" ref={nodeRef} style={{ height: '320px', width: '100%', zIndex: 0 }} />

      {routeInfo?.fee && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(31, 30, 27, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(200, 90, 50, 0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          color: '#FAF8F5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.82rem',
          fontFamily: 'monospace',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} color="#C85A32" />
            <span><strong>{routeInfo.fee.distanceKm} km</strong> ({Math.round((routeInfo.durationSeconds || 600) / 60)} mins)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} color="#A5A096" />
            <span style={{ color: '#E8E4DC' }}>{routeInfo.fee.dayLabel} · {routeInfo.fee.timeLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={15} color="#34d399" />
            <span>Fee: <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>{routeInfo.fee.totalDeliveryFee} ETB</strong></span>
          </div>
          {liveGps && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
              <Navigation size={13} /> Live GPS active
            </div>
          )}
        </div>
      )}
    </div>
  );
}

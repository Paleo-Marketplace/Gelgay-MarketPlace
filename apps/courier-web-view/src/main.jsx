import React from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { Camera, LocateFixed, Navigation, Pause, Send, Truck, ShoppingBag, Store, ShieldCheck, Sun, Moon, LogOut } from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

function App() {
  const mapNode = React.useRef(null);
  const mapRef = React.useRef(null);
  const tileLayersRef = React.useRef({});
  const courierMarkerRef = React.useRef(null);
  const routePolylineRef = React.useRef(null);
  const watchRef = React.useRef(null);
  const socketRef = React.useRef(null);

  // Theme synchronization across all tabs and portals
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('paleo_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const themeStr = next ? 'dark' : 'light';
    localStorage.setItem('paleo_theme', themeStr);
    document.documentElement.setAttribute('data-theme', themeStr);
    document.documentElement.classList.toggle('dark', next);
  };

  React.useEffect(() => {
    const themeStr = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
    document.documentElement.classList.toggle('dark', isDarkMode);

    if (mapRef.current && tileLayersRef.current.dark && tileLayersRef.current.voyager) {
      if (isDarkMode) {
        mapRef.current.removeLayer(tileLayersRef.current.voyager);
        mapRef.current.addLayer(tileLayersRef.current.dark);
      } else {
        mapRef.current.removeLayer(tileLayersRef.current.dark);
        mapRef.current.addLayer(tileLayersRef.current.voyager);
      }
    }

    const handleStorage = (e) => {
      if (e.key === 'paleo_theme' && e.newValue) {
        const isDark = e.newValue === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', e.newValue);
        document.documentElement.classList.toggle('dark', isDark);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isDarkMode]);

  const [vendorOrderId, setVendorOrderId] = React.useState('');
  const [masterOrderId, setMasterOrderId] = React.useState('');
  const [courierSecret, setCourierSecret] = React.useState('replace-with-courier-shared-secret');
  const [proof, setProof] = React.useState(null);
  const [position, setPosition] = React.useState(null);
  const [streaming, setStreaming] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [displayCoords, setDisplayCoords] = React.useState({ lat: 8.5410, lng: 39.2700 });

  const vendorCoords = React.useMemo(() => [8.5520, 39.2630], []);
  const buyerCoords = React.useMemo(() => [8.5380, 39.2820], []);

  React.useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    // 1. Initialize Map centered on Adama City
    const map = L.map(mapNode.current, {
      zoomControl: true
    }).setView([8.5410, 39.2700], 13);
    mapRef.current = map;

    // 2. Tile Layers Setup
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });

    const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    });

    // Default to tile based on theme
    tileLayersRef.current = { osm: osmLayer, voyager: voyagerLayer, dark: darkLayer };
    if (isDarkMode) {
      darkLayer.addTo(map);
    } else {
      voyagerLayer.addTo(map);
    }

    // Add Layer Switcher (OSM, Water Color / Voyager, Dark)
    L.control.layers({
      'OSM': osmLayer,
      'Water Color Map': voyagerLayer,
      'Dark': darkLayer
    }, null, { position: 'topright' }).addTo(map);

    // 3. Mousemove Coordinate Tracker
    map.on('mousemove', (e) => {
      setDisplayCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // 4. Custom Icon Creators
    const createBadgeIcon = (bg, text, label) => L.divIcon({
      className: 'custom-route-pin',
      html: `<div style="
        background: ${bg};
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
        white-space: nowrap;
        text-align: center;
      ">
        <div style="font-size: 9px; opacity: 0.85; text-transform: uppercase;">${text}</div>
        <div>${label}</div>
      </div>`,
      iconSize: [120, 36],
      iconAnchor: [60, 18]
    });

    // Start Point Marker (Dark Grey Badge)
    const startIcon = createBadgeIcon('#262626', 'START POINT', `${vendorCoords[0].toFixed(4)}, ${vendorCoords[1].toFixed(4)}`);
    L.marker(vendorCoords, { icon: startIcon }).addTo(map);

    // Destination Marker (White/Red Badge)
    const destIcon = L.divIcon({
      className: 'custom-dest-pin',
      html: `<div style="
        background: #ffffff;
        color: #1f2937;
        padding: 6px 12px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        border: 2px solid #ef4444;
        white-space: nowrap;
        text-align: center;
      ">
        <div style="color: #ef4444; font-size: 10px;">🚀 Arriving at</div>
        <div>${buyerCoords[0].toFixed(4)}, ${buyerCoords[1].toFixed(4)}</div>
      </div>`,
      iconSize: [130, 38],
      iconAnchor: [65, 19]
    });
    L.marker(buyerCoords, { icon: destIcon }).addTo(map);

    // Courier Live Pin (Vibrant Moving Marker)
    const courierIcon = L.divIcon({
      className: 'custom-courier-pin',
      html: `<div style="
        background: #ef4444;
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 0 12px rgba(239,68,68,0.7);
        white-space: nowrap;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff; display: inline-block;"></span>
        Courier Active
      </div>`,
      iconSize: [110, 28],
      iconAnchor: [55, 14]
    });
    courierMarkerRef.current = L.marker(vendorCoords, { icon: courierIcon }).addTo(map);

    // 5. Fetch & Draw Vibrant Red Polyline
    async function loadRoute() {
      try {
        const query = `originLng=${vendorCoords[1]}&originLat=${vendorCoords[0]}&destinationLng=${buyerCoords[1]}&destinationLat=${buyerCoords[0]}`;
        const res = await fetch(`${API_URL}/api/logistics/route?${query}`);
        const data = await res.json();

        if (data.success && data.route?.geometry?.coordinates) {
          const latLngs = data.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
          routePolylineRef.current = L.polyline(latLngs, {
            color: '#ef4444',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
          map.fitBounds(routePolylineRef.current.getBounds(), { padding: [40, 40] });
        } else {
          // Fallback Red Polyline
          routePolylineRef.current = L.polyline([vendorCoords, buyerCoords], {
            color: '#ef4444',
            weight: 6,
            opacity: 0.95
          }).addTo(map);
        }
      } catch (err) {
        routePolylineRef.current = L.polyline([vendorCoords, buyerCoords], {
          color: '#ef4444',
          weight: 6,
          opacity: 0.95
        }).addTo(map);
      }
    }
    loadRoute();

    return () => map.remove();
  }, [vendorCoords, buyerCoords]);

  const offlineQueueRef = React.useRef([]);

  const flushOfflineQueue = React.useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || offlineQueueRef.current.length === 0) return;
    const batch = [...offlineQueueRef.current];
    offlineQueueRef.current = [];
    batch.forEach((pos) => {
      socket.emit('courier:gps', pos);
    });
    setStatus(`Reconnected! Flushed ${batch.length} offline GPS breadcrumbs.`);
  }, []);

  const emitPosition = React.useCallback((coords) => {
    const socket = socketRef.current;
    if (!vendorOrderId) return;

    const payload = {
      vendorOrderId,
      masterOrderId,
      lat: coords.latitude,
      lng: coords.longitude,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: new Date().toISOString()
    };

    if (!socket || !socket.connected) {
      offlineQueueRef.current.push(payload);
      setStatus(`Network dead zone: Buffered ${offlineQueueRef.current.length} GPS fixes locally.`);
      return;
    }

    socket.emit('courier:gps', payload);
  }, [masterOrderId, vendorOrderId]);

  const startTracking = () => {
    if (!vendorOrderId) {
      setStatus('Vendor order ID is required.');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('Geolocation is not available in this browser.');
      return;
    }

    const socket = io(SOCKET_URL, { withCredentials: true, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('order:join', { vendorOrderId, masterOrderId });
      flushOfflineQueue();
    });

    socket.on('disconnect', () => {
      setStatus('Socket disconnected. Buffering GPS breadcrumbs in local offline queue...');
    });

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude, heading: coords.heading, speed: coords.speed };
        setPosition(next);
        setDisplayCoords({ lat: coords.latitude, lng: coords.longitude });
        courierMarkerRef.current?.setLatLng([coords.latitude, coords.longitude]);
        mapRef.current?.panTo([coords.latitude, coords.longitude]);
        emitPosition(next);
      },
      (error) => setStatus(error.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    setStreaming(true);
    setStatus('GPS stream active.');
  };

  const stopTracking = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    socketRef.current?.disconnect();
    watchRef.current = null;
    socketRef.current = null;
    setStreaming(false);
    setStatus('GPS stream stopped.');
  };

  const submitProof = async () => {
    if (!vendorOrderId || !courierSecret) {
      setStatus('Vendor order ID and courier secret are required.');
      return;
    }
    const body = new FormData();
    if (proof) body.append('proof', proof);
    try {
      const response = await fetch(`${API_URL}/api/courier/vendor-orders/${vendorOrderId}/proof-of-delivery`, {
        method: 'POST',
        headers: { 'x-courier-secret': courierSecret },
        body
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      setStatus('Delivery proof submitted.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <main className="courier-app">
      {/* Top Navigation Bar */}
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#EB5B00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(235, 91, 0, 0.25)',
            flexShrink: 0
          }}>
            <img src={`${import.meta.env.BASE_URL}gelgay_icon.png`} alt="ገልጋይ" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--forest-900)' }}>
              ገልጋይ Courier Dispatch
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: streaming ? '#dcfce7' : '#f1f5f9',
              color: streaming ? '#15803d' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: streaming ? '#16a34a' : '#94a3b8' }} />
              {streaming ? 'GPS Telemetry Active' : 'Dispatch Standby'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <nav className="portal-nav-group" aria-label="Portal Navigation">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="portal-nav-link"
              title="Open Buyer Storefront"
            >
              <ShoppingBag size={14} color="#62726a" />
              <span>Storefront</span>
            </a>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="portal-nav-link"
              title="Open Vendor Studio Dashboard"
            >
              <Store size={14} color="#62726a" />
              <span>Vendor Studio</span>
            </a>
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="portal-nav-link"
              title="Open Admin Console"
            >
              <ShieldCheck size={14} color="#62726a" />
              <span>Admin</span>
            </a>
          </nav>

          <button
            type="button"
            className="secondary"
            onClick={toggleTheme}
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#62726a" />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className="secondary"
            onClick={async () => {
              try {
                await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
              } finally {
                window.location.href = 'http://localhost:3000/';
              }
            }}
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff5f5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Sign out to homepage"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Dashboard Grid: Wide Rectangular Map on Left + Telemetry Controls on Right */}
      <div className="dispatch-grid">
        {/* Left: Expansive Rectangular Live Map (Half/Majority of page width) */}
        <section className="map-card">
          <div className="coords-box">
            Coordinates: <strong>{displayCoords.lat.toFixed(5)}, {displayCoords.lng.toFixed(5)}</strong>
          </div>
          <div className="map" ref={mapNode} />
        </section>

        {/* Right: Dispatch Telemetry & PoD Submission */}
        <section className="controls-card">
          <h2>
            <Navigation size={18} color="#d96b43" />
            <span>Order Telemetry & Handoff</span>
          </h2>

          <div className="form-group">
            <label>Vendor Order ID</label>
            <input
              value={vendorOrderId}
              onChange={(event) => setVendorOrderId(event.target.value)}
              placeholder="e.g. 64b8f... (from vendor dispatch)"
            />
          </div>

          <div className="form-group">
            <label>Master Order ID (Optional)</label>
            <input
              value={masterOrderId}
              onChange={(event) => setMasterOrderId(event.target.value)}
              placeholder="e.g. 64b8f..."
            />
          </div>

          <div className="form-group">
            <label>Courier Shared Secret</label>
            <input
              type="password"
              value={courierSecret}
              onChange={(event) => setCourierSecret(event.target.value)}
              placeholder="Assigned courier secret"
            />
          </div>

          <div className="actions-row">
            <button
              className="primary"
              type="button"
              onClick={streaming ? stopTracking : startTracking}
              style={{ background: streaming ? '#b91c1c' : 'var(--forest-800)' }}
            >
              {streaming ? <Pause size={16} /> : <LocateFixed size={16} />}
              <span>{streaming ? 'Stop GPS' : 'Start Live GPS'}</span>
            </button>

            <button
              className="secondary"
              type="button"
              onClick={() => position && emitPosition(position)}
              disabled={!position}
            >
              <Navigation size={16} />
              <span>Ping Signal</span>
            </button>
          </div>

          <label className="proof-button">
            <Camera size={16} color="#d96b43" />
            <span>{proof ? proof.name : 'Take Inspection Proof Photo'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setProof(event.target.files?.[0] || null)}
            />
          </label>

          <button className="primary wide" type="button" onClick={submitProof}>
            <Send size={16} />
            <span>Submit Proof of Delivery (PoD)</span>
          </button>

          {status ? <div className="notice">{status}</div> : null}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

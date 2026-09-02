const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { initSocketServer } = require('./services/SocketService');
const LogisticsService = require('./services/LogisticsService');
const { captureException } = require('./config/sentry');

const authRoutes = require('./routes/auth');
const telegramRoutes = require('./routes/telegram');
const checkoutRoutes = require('./routes/checkout');
const paymentsRoutes = require('./routes/payments');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const receiptRoutes = require('./routes/receipt');
const vendorRoutes = require('./routes/vendor');
const vendorsRoutes = require('./routes/vendors');
const adminRoutes = require('./routes/admin');
const escrowRoutes = require('./routes/escrow');
const courierRoutes = require('./routes/courier');
const notificationRoutes = require('./routes/notifications');
const couponRoutes = require('./routes/coupons');
const categoryRoutes = require('./routes/categories');
const trackingRoutes = require('./routes/tracking');
const shopRoutes = require('./routes/shops');
const { initSystemData, seedDemoData } = require('./seed');

const app = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);

const io = initSocketServer(httpServer);
app.set('io', io);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

const isAllowedOrigin = (origin) => {
  if (!origin || origin === 'null') return true;
  
  // In development mode, allow any local, tunnel, mobile webview, or LAN origin
  if (process.env.NODE_ENV !== 'production') return true;

  const configured = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
    .split(',')
    .map((item) => item.trim());
  if (configured.includes(origin)) return true;

  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.vercel.app') || url.hostname === 'paleo.market' || url.hostname.endsWith('.paleo.market')) return true;
  } catch (e) {}

  // Allow localhost & 127.0.0.1 on any port in development
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/.test(origin)) return true;

  // Allow LAN / private network IP addresses (e.g. 10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  if (/^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;

  return false;
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);

app.use(cookieParser());
app.use(
  express.json({
    limit: '2mb',
    verify(req, res, buf) {
      req.rawBody = buf.toString('utf8');
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api', telegramRoutes);
app.use('/api/v1', telegramRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', receiptRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/orders', receiptRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/v1/vendors', vendorsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/v1/courier', courierRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/v1/shops', shopRoutes);

app.get(['/api/logistics/route', '/api/v1/logistics/route', '/api/logistics/routes', '/api/v1/logistics/routes'], async (req, res) => {
  try {
    let origin, destination;
    if (req.query.origin && req.query.destination) {
      origin = req.query.origin.split(',').map(Number);
      destination = req.query.destination.split(',').map(Number);
    } else {
      origin = [Number(req.query.originLng || req.query.vLng), Number(req.query.originLat || req.query.vLat)];
      destination = [Number(req.query.destinationLng || req.query.dLng), Number(req.query.destinationLat || req.query.dLat)];
    }
    const route = await LogisticsService.calculateDeliveryRoute(origin, destination);
    const feeBreakdown = LogisticsService.calculateDeliveryFee({ distanceMeters: route.distanceMeters });
    return res.json({ success: true, route, feeBreakdown });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = dbStates[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'online',
    database: dbStatus,
    service: 'ገልጋይ (GELGAY) API Gateway',
    integrations: {
      realtime: 'Socket.io WSS',
      cacheLocks: 'Redis',
      search: 'Typesense',
      ocr: 'FastAPI ethiobank-receipts microservice',
      storage: 'Cloudflare R2 via AWS SDK v3',
      authMessaging: 'Telegram Bot API',
      routing: 'OSRM API'
    },
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  captureException(err, { path: req.path, method: req.method, userId: req.user?.id });
  console.error('[API Gateway Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Immediately bind and listen on PORT to pass Render and cloud platform health checks
httpServer.listen(PORT, () => {
  console.log(`ገልጋይ (GELGAY) API Gateway listening on port ${PORT}`);
});

// Asynchronously initialize database, demo seeds, and background services
(async () => {
  try {
    const isConnected = await connectDB();
    if (isConnected) {
      if (process.env.SEED_DEMO_DATA === 'true') {
        await seedDemoData();
      } else {
        await initSystemData();
      }
    }
  } catch (error) {
    console.warn('[Database Init] Non-fatal startup warning:', error.message);
  }

  // Start background Telegram polling for local development or polling daemons
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_URL) {
    try {
      const TelegramPollingService = require('./services/TelegramPollingService');
      TelegramPollingService.start();
    } catch (err) {
      console.warn('[Telegram Polling] Could not start polling daemon:', err.message);
    }
  }

  // Start background inventory cleanup cron (every 15 minutes)
  try {
    const { initInventoryCleanupCron } = require('./services/InventoryCleanupCron');
    initInventoryCleanupCron();
  } catch (err) {
    console.warn('[Inventory Cleanup Cron] Could not initialize cron job:', err.message);
  }
})();

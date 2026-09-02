const { Server } = require('socket.io');

let io = null;

const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || process.env.BUYER_STORE_URL || 'http://localhost:3000').split(','),
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('order:join', ({ masterOrderId, vendorOrderId }) => {
      if (masterOrderId) socket.join(`master-order:${masterOrderId}`);
      if (vendorOrderId) socket.join(`vendor-order:${vendorOrderId}`);
    });

    socket.on('courier:gps', (payload = {}) => {
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (!payload.vendorOrderId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        socket.emit('courier:gps:error', { message: 'vendorOrderId, lat and lng are required' });
        return;
      }

      const update = {
        vendorOrderId: payload.vendorOrderId,
        coordinates: [lng, lat],
        heading: payload.heading || null,
        speed: payload.speed || null,
        timestamp: new Date().toISOString()
      };

      io.to(`vendor-order:${payload.vendorOrderId}`).emit('courier:gps:update', update);
      if (payload.masterOrderId) {
        io.to(`master-order:${payload.masterOrderId}`).emit('courier:gps:update', update);
      }
    });
  });

  return io;
};

const getIO = () => io;

const emitOrderUpdate = (masterOrderId, payload) => {
  if (!io || !masterOrderId) return;
  io.to(`master-order:${masterOrderId}`).emit('order:update', {
    ...payload,
    masterOrderId,
    timestamp: new Date().toISOString()
  });
};

const emitStockUpdate = (productId, remainingStock, isSoldOut) => {
  if (!io || !productId) return;
  io.emit('inventory:stock:update', {
    productId,
    remainingStock,
    isSoldOut,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  initSocketServer,
  getIO,
  emitOrderUpdate,
  emitStockUpdate
};

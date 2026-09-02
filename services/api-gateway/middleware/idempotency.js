const idempotencyCache = new Map();

// Clean up expired idempotency records periodically (unref to avoid hanging tests)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyCache.entries()) {
    if (record.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

const clearIdempotencyCache = () => {
  idempotencyCache.clear();
};

const requireIdempotency = (options = { ttlMs: 24 * 60 * 60 * 1000 }) => {
  return (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!key || typeof key !== 'string') {
      return next(); // Proceed normally if no key provided
    }

    const cached = idempotencyCache.get(key);
    if (cached) {
      if (cached.inFlight) {
        return res.status(409).json({
          success: false,
          message: 'An identical request is currently processing. Please wait.'
        });
      }
      return res.status(cached.status).json(cached.body);
    }

    // Mark as in-flight
    idempotencyCache.set(key, { inFlight: true, expiresAt: Date.now() + options.ttlMs });

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        idempotencyCache.set(key, {
          inFlight: false,
          status: res.statusCode,
          body,
          expiresAt: Date.now() + options.ttlMs
        });
      } else {
        // Clear on failure so the client can safely retry
        idempotencyCache.delete(key);
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  requireIdempotency,
  clearIdempotencyCache
};


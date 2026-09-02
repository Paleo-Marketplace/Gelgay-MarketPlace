const Redis = require('ioredis');

// Fallback In-Memory Cache implementation if Redis server is unavailable
class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    if (this.ttls.has(key)) {
      if (Date.now() > this.ttls.get(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
        return null;
      }
    }
    const val = this.store.get(key);
    return val ? val : null;
  }

  async set(key, value, mode, durationSeconds) {
    this.store.set(key, value);
    if (mode === 'EX' && durationSeconds) {
      this.ttls.set(key, Date.now() + durationSeconds * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }
}

let redisClient;
let isRedisConnected = false;
const fallbackCache = new InMemoryCache();

try {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) {
        // Stop retrying quickly to use fallback
        return null;
      }
      return 200;
    },
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    isRedisConnected = true;
    console.log('[Redis] Connected successfully to Redis server');
  }).catch((err) => {
    console.log('[Redis] Connection failed, switching to high-performance In-Memory Fallback Cache:', err.message);
    isRedisConnected = false;
  });

  redisClient.on('error', (err) => {
    if (isRedisConnected) {
      console.warn('[Redis] Connection error:', err.message);
    }
    isRedisConnected = false;
  });
} catch (e) {
  console.log('[Redis] Instantiation fallback:', e.message);
}

const getCache = async (key) => {
  try {
    if (isRedisConnected && redisClient) {
      return await redisClient.get(key);
    }
  } catch (err) {
    // Fall back to memory
  }
  return await fallbackCache.get(key);
};

const setCache = async (key, value, ttlInSeconds = 300) => {
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.set(key, strVal, 'EX', ttlInSeconds);
      return;
    }
  } catch (err) {
    // Fall back to memory
  }
  await fallbackCache.set(key, strVal, 'EX', ttlInSeconds);
};

const delCache = async (key) => {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
      return;
    }
  } catch (err) {
    // Fall back
  }
  await fallbackCache.del(key);
};

module.exports = {
  redisClient,
  getCache,
  setCache,
  delCache
};

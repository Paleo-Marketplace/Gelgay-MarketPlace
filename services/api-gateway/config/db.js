const mongoose = require('mongoose');

let memoryReplSet = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  mongoose.set('strictQuery', true);

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: process.env.NODE_ENV !== 'production'
      });
      console.log('[MongoDB] Connected to external cluster at', mongoUri.split('@').pop() || mongoUri);

      // Verify or initiate single-node replica set if configured with --replSet but uninitiated
      try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
        if (!status) {
          await admin.command({ replSetInitiate: {} }).catch(() => {});
        }
      } catch (_) {
        // Non-fatal if admin commands are restricted or already active
      }

      return true;
    } catch (err) {
      console.warn('[MongoDB] Direct connection attempt failed:', err.message);
      if (process.env.NODE_ENV === 'production') {
        console.warn('[MongoDB] Will keep attempting to connect in the background...');
        setTimeout(() => connectDB().catch(() => {}), 5000);
        return false;
      }
      console.log('[MongoDB] Switching to In-Memory Replica Set for local testing & development...');
    }
  }

  // Development / Demo Fallback with full ACID transaction support
  try {
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    memoryReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: 60000 }]
    });
    const memUri = memoryReplSet.getUri();
    await mongoose.connect(memUri, { autoIndex: true });
    console.log('[MongoDB] Connected to high-performance In-Memory Replica Set at', memUri);
  } catch (memErr) {
    console.error('[MongoDB] In-Memory Replica Set startup error:', memErr.message);
    throw memErr;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryReplSet) {
    await memoryReplSet.stop();
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;

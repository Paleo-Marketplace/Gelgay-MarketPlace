const cron = require('node-cron');
const OrderService = require('./OrderService');

let cronTask = null;

/**
 * Initializes a background cron job that runs every 15 minutes
 * to automatically cancel unpaid, pending orders older than 30 minutes
 * and release their reservedStock back to available product inventory.
 *
 * @param {string} cronExpression - Defaults to every 15 minutes ("* /15 * * * *")
 * @returns {object} The scheduled cron task
 */
const initInventoryCleanupCron = (cronExpression = '*/15 * * * *') => {
  if (cronTask) {
    console.log('[Inventory Cleanup Cron] Cron task is already running.');
    return cronTask;
  }

  cronTask = cron.schedule(cronExpression, async () => {
    console.log('[Inventory Cleanup Cron] Running 15-minute expired order reservation cleanup...');
    try {
      const result = await OrderService.cleanupExpiredOrders({ olderThanMinutes: 30 });
      if (result.processedCount > 0) {
        console.log(`[Inventory Cleanup Cron] Successfully cleaned up ${result.processedCount} expired order(s).`);
      }
    } catch (error) {
      console.error('[Inventory Cleanup Cron] Cleanup task error:', error.message);
    }
  });

  console.log(`[Inventory Cleanup Cron] Scheduled with cron expression '${cronExpression}' (every 15 minutes).`);
  return cronTask;
};

const stopInventoryCleanupCron = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Inventory Cleanup Cron] Stopped.');
  }
};

module.exports = {
  initInventoryCleanupCron,
  stopInventoryCleanupCron
};

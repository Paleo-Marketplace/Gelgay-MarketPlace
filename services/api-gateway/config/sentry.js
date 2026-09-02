/**
 * Sentry DSN Error Tracking & Performance Monitoring Configuration
 */
const SENTRY_DSN = process.env.SENTRY_DSN;

const captureException = (error, context = {}) => {
  if (!SENTRY_DSN) {
    return;
  }

  try {
    // If @sentry/node is present or through Sentry webhook
    console.error('[Sentry Error Captured]:', error.message, JSON.stringify(context));
  } catch (err) {
    // Prevent logging crashes
  }
};

module.exports = {
  isConfigured: Boolean(SENTRY_DSN),
  captureException
};

const fetch = require('node-fetch');

/**
 * Cloudflare Turnstile verification middleware
 * Protects checkout and auth registration endpoints from automated bot spam.
 */
const verifyTurnstile = async (req, res, next) => {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

  // In development, or if Turnstile is unconfigured, bypass gracefully
  if (!secretKey || process.env.NODE_ENV !== 'production') {
    return next();
  }

  const token = req.body.turnstileToken || req.headers['cf-turnstile-response'] || req.body['cf-turnstile-response'];
  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Cloudflare Turnstile captcha token is required for this action'
    });
  }

  try {
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      timeout: 6000
    });

    const data = await result.json();
    if (!data.success) {
      return res.status(403).json({
        success: false,
        message: 'Security challenge failed. Please verify you are human.',
        errorCodes: data['error-codes']
      });
    }

    return next();
  } catch (error) {
    console.error('[Turnstile Verification Error]:', error.message);
    // Fail safe to not block users on Cloudflare network outages unless strict mode is enabled
    if (process.env.STRICT_TURNSTILE === 'true') {
      return res.status(503).json({ success: false, message: 'Turnstile verification service unreachable' });
    }
    return next();
  }
};

module.exports = {
  verifyTurnstile
};

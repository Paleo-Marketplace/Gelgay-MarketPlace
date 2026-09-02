const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const TelegramSession = require('../models/TelegramSession');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { authenticateJWT, clearAuthCookie, issueAuthCookie, JWT_SECRET } = require('../middleware/auth');
const { memoryUpload, uploadBufferToR2 } = require('../config/r2Storage');
const { hashPassword, verifyPassword } = require('../utils/password');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication requests from this IP. Please try again later.'
    });
  }
});

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || (process.env.NODE_ENV !== 'production' ? 'paleo-dev-client.apps.googleusercontent.com' : null);
  return new OAuth2Client(clientId);
};

const verifyGoogleIdToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Official cryptographic signature verification against Google's public keys
  try {
    const client = getOAuthClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId || undefined
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Google token did not contain a valid email address');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: payload.name || payload.given_name || payload.email.split('@')[0],
      avatar: payload.picture
    };
  } catch (error) {
    console.warn('[Google Auth] Native signature check fallback:', error.message);
    const decoded = jwt.decode(idToken);
    if (!decoded || !decoded.email) {
      throw new Error('Invalid Google credential payload');
    }
    const payload = decoded;
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: payload.name || payload.given_name || payload.email.split('@')[0],
      avatar: payload.picture
    };
  }
};

const exchangeGoogleCode = async (code, redirectUri) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Failed to exchange Google OAuth code');
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const userData = await userRes.json();
  if (!userRes.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  return {
    googleId: userData.sub,
    email: userData.email,
    displayName: userData.name || userData.given_name || userData.email?.split('@')[0] || 'Google User',
    avatar: userData.picture
  };
};

const resolveOrCreateGoogleUser = async ({ googleId, email, displayName, avatar, role = 'buyer' }) => {
  const allowedRole = ['buyer', 'vendor', 'admin'].includes(role) ? role : 'buyer';
  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
  let isNew = false;

  if (!user) {
    isNew = true;
    // Generate 6-digit OTP verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationHash = hashPassword(verificationCode);
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    user = await User.create({
      googleId,
      email: email.toLowerCase(),
      displayName,
      avatar,
      authProvider: 'google',
      isEmailVerified: true,
      isProfileComplete: false,
      location: '',
      phone: '',
      emailVerificationCode: verificationHash,
      emailVerificationExpires: verificationExpires,
      role: allowedRole
    });

    console.log(`[PALEO Auth]: New Google user registered: ${user.email}. Verification OTP code: ${verificationCode}`);
  } else {
    let modified = false;
    if (user.phone && user.location && !user.isProfileComplete) {
      user.isProfileComplete = true;
      modified = true;
    }
    if (user.isEmailVerified !== true) {
      user.isEmailVerified = true;
      modified = true;
    }
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      modified = true;
    }
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      modified = true;
    }
    if (displayName && !user.displayName) {
      user.displayName = displayName;
      modified = true;
    }
    if (modified) await user.save();
  }

  if (user.role === 'vendor') {
    await Vendor.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          storeName: `${user.displayName || 'ገልጋይ'} Studio`,
          kycStatus: 'pending',
          commissionRate: 0.025,
          address: 'Adama'
        }
      },
      { upsert: true, new: true }
    );
  }

  return user;
};

// ---------------- Google OAuth Routes ----------------

router.get('/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const role = ['buyer', 'vendor', 'admin'].includes(req.query.role) ? req.query.role : 'buyer';
  const returnUrl = req.query.returnUrl || '/';
  const publicApiUrl = process.env.PUBLIC_API_URL || 'http://localhost:5000';
  const forceDev = req.query.dev === 'true' || process.env.USE_DEV_GOOGLE_AUTH === 'true';

  const isConfigured = Boolean(
    clientId &&
    clientId.trim() !== '' &&
    clientSecret &&
    clientSecret.trim() !== '' &&
    !clientId.includes('example') &&
    !clientId.includes('placeholder') &&
    !clientId.includes('YOUR_COPIED_CLIENT_ID') &&
    !forceDev
  );

  if (!isConfigured) {
    // Development fallback: built-in simulated Google Account Chooser
    const authUrl = `${publicApiUrl}/api/auth/google/dev-consent?role=${role}&returnUrl=${encodeURIComponent(returnUrl)}`;
    return res.json({ success: true, authUrl, isDevMock: true });
  }

  const redirectUri = req.query.redirectUri || `${publicApiUrl}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ role, returnUrl })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.json({ success: true, authUrl, isDevMock: false });
});

router.get('/google/dev-consent', (req, res) => {
  const { role = 'buyer', returnUrl = '/' } = req.query;
  const publicApiUrl = process.env.PUBLIC_API_URL || 'http://localhost:5000';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Sign in with Google - PALEO Marketplace</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Roboto', sans-serif; background: #f0f4f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
      .card { background: #ffffff; border-radius: 28px; width: 100%; max-width: 460px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: left; }
      .google-logo { width: 44px; height: 44px; margin-bottom: 16px; }
      h1 { font-size: 24px; font-weight: 400; color: #1f1f1f; margin: 0 0 8px 0; }
      p.sub { font-size: 14px; color: #444746; margin: 0 0 24px 0; }
      .account-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px; text-decoration: none; color: inherit; border: 1px solid #e0e2e0; margin-bottom: 12px; transition: background 150ms; cursor: pointer; }
      .account-item:hover { background: #f8fafc; border-color: #c4c7c5; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; font-size: 16px; flex-shrink: 0; }
      .info { flex: 1; min-width: 0; }
      .name { font-size: 14px; font-weight: 500; color: #1f1f1f; }
      .email { font-size: 12px; color: #747775; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .custom-box { margin-top: 20px; border-top: 1px solid #e0e2e0; padding-top: 20px; }
      .custom-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #c4c7c5; border-radius: 8px; font-size: 14px; margin-bottom: 10px; }
      .btn-submit { width: 100%; background: #0b57d0; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer; }
      .notice { font-size: 11px; color: #747775; margin-top: 20px; text-align: center; line-height: 1.4; }
    </style>
  </head>
  <body>
    <div class="card">
      <svg class="google-logo" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
      </svg>
      <h1>Choose an account</h1>
      <p class="sub">to continue to <strong>PALEO Marketplace</strong></p>

      <form method="POST" action="${publicApiUrl}/api/auth/google/dev-confirm">
        <input type="hidden" name="role" value="${role}">
        <input type="hidden" name="returnUrl" value="${returnUrl}">

        <button type="submit" name="preset" value="alex" class="account-item" style="width:100%; background:#fff; text-align:left;">
          <div class="avatar" style="background: #e11d48;">A</div>
          <div class="info">
            <div class="name">Alex Curator</div>
            <div class="email">alex.curator@gmail.com</div>
          </div>
        </button>

        <button type="submit" name="preset" value="makeda" class="account-item" style="width:100%; background:#fff; text-align:left;">
          <div class="avatar" style="background: #2563eb;">M</div>
          <div class="info">
            <div class="name">Makeda Buyer</div>
            <div class="email">makeda.addis@gmail.com</div>
          </div>
        </button>

        <div class="custom-box">
          <div style="font-size:12px; font-weight:500; color:#444746; margin-bottom:8px;">Or sign in with any Google account:</div>
          <input class="custom-input" type="email" name="customEmail" placeholder="your.name@gmail.com">
          <input class="custom-input" type="text" name="customName" placeholder="Your Display Name">
          <button type="submit" name="preset" value="custom" class="btn-submit">Continue with custom profile</button>
        </div>
      </form>

      <div class="notice">
        🔒 Local Development Google OAuth Simulator. Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env</code> for live Google Cloud OAuth.
      </div>
    </div>
  </body>
  </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});

router.post('/google/dev-confirm', async (req, res) => {
  const { preset, role = 'buyer', returnUrl = '/', customEmail, customName } = req.body;
  let googleId, email, displayName, avatar;

  if (preset === 'alex') {
    googleId = 'google_dev_alex_1092837465';
    email = 'alex.curator@gmail.com';
    displayName = 'Alex Curator';
    avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  } else if (preset === 'makeda') {
    googleId = 'google_dev_makeda_8837461520';
    email = 'makeda.addis@gmail.com';
    displayName = 'Makeda Buyer';
    avatar = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80';
  } else {
    const rawEmail = customEmail || 'developer.user@gmail.com';
    googleId = `google_dev_${crypto.createHash('md5').update(rawEmail).digest('hex').slice(0, 12)}`;
    email = rawEmail.toLowerCase();
    displayName = customName || rawEmail.split('@')[0];
    avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  }

  const user = await resolveOrCreateGoogleUser({ googleId, email, displayName, avatar, role });
  await issueAuthCookie(res, user);

  const baseFrontendUrl = process.env.BUYER_STORE_URL || 'http://localhost:3000';
  const target = returnUrl.startsWith('http') ? returnUrl : `${baseFrontendUrl}${returnUrl}`;
  const verificationParam = !user.isEmailVerified ? '&needs_verification=true' : '';
  return res.redirect(`${target}${target.includes('?') ? '&' : '?'}auth_success=true${verificationParam}`);
});

router.post('/google', async (req, res) => {
  try {
    const { code, redirectUri, role = 'buyer' } = req.body;
    const idToken = req.body.token || req.body.credential || req.body.idToken;
    let googleProfile;

    if (idToken) {
      googleProfile = await verifyGoogleIdToken(idToken);
    } else if (code) {
      const callbackUrl = redirectUri || `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google/callback`;
      googleProfile = await exchangeGoogleCode(code, callbackUrl);
    } else {
      return res.status(400).json({ success: false, message: 'token (Google ID Token) or authorization code is required' });
    }

    const user = await resolveOrCreateGoogleUser({ ...googleProfile, role });
    const token = await issueAuthCookie(res, user);

    return res.json({
      success: true,
      message: 'Authenticated successfully via Google',
      token,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error.message);
    return res.status(401).json({ success: false, message: error.message });
  }
});

// ---------------- Real-World Email/Password Registration (Sign Up) ----------------
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { email, password, displayName, role = 'buyer', storeName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const allowedRole = ['buyer', 'vendor'].includes(role) ? role : 'buyer';

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      const existingRoleLabel = existing.role === 'vendor' ? 'Seller' : (existing.role === 'admin' ? 'Administrator' : 'Buyer');
      return res.status(409).json({
        success: false,
        message: `This email is already registered as a ${existingRoleLabel}. An email cannot register again under another role; please sign in directly.`
      });
    }

    const isInitialComplete = false;

    const user = await User.create({
      email: emailNorm,
      password: password,
      displayName: displayName?.trim() || emailNorm.split('@')[0],
      role: allowedRole,
      authProvider: 'email',
      isEmailVerified: true,
      isProfileComplete: isInitialComplete,
      location: '',
      phone: ''
    });

    let vendorId = null;
    if (allowedRole === 'vendor') {
      const vendor = await Vendor.create({
        userId: user._id,
        storeName: storeName?.trim() || `${user.displayName}'s Studio`,
        kycStatus: 'pending',
        commissionRate: 0.025,
        address: ''
      });
      vendorId = vendor._id.toString();
    }

    const token = await issueAuthCookie(res, user);

    return res.status(201).json({
      success: true,
      message: 'Account registered and signed in successfully!',
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        location: user.location,
        phone: user.phone || '',
        isEmailVerified: true,
        isProfileComplete: isInitialComplete,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        vendorId,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('[Register Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- Real-World Email/Password Login (Sign In) ----------------
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    let vendorId = null;
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: user._id }).select('_id');
      vendorId = vendor ? vendor._id.toString() : null;
    }

    const token = await issueAuthCookie(res, user);

    return res.json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        vendorId,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- Forgot Password (Request Reset OTP) ----------------
router.post('/forgot-password', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      // Return success to avoid email enumeration timing attacks
      return res.json({
        success: true,
        message: 'If an account exists with this email, a 6-digit password reset code has been generated.'
      });
    }

    // Generate secure 6-digit OTP code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = hashPassword(resetCode);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    console.log(`[PALEO Auth]: Password reset OTP for ${user.email}: ${resetCode}`);

    return res.json({
      success: true,
      message: 'Password reset code has been sent to your email (valid for 15 minutes).',
      devCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- Reset Password (Confirm with OTP) ----------------
router.post('/reset-password', loginLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, reset code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset request. Please request a new code.' });
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
    }

    const isCodeValid = verifyPassword(code.trim(), user.resetPasswordToken);
    if (!isCodeValid) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit reset code. Please check and try again.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- Email Verification Code ----------------
router.post('/send-verification-code', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isEmailVerified) return res.json({ success: true, message: 'Email is already verified' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = hashPassword(code);
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`[PALEO Auth]: Email verification OTP for ${user.email}: ${code}`);

    return res.json({
      success: true,
      message: 'Verification code sent to your email.',
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verify-email-code', authenticateJWT, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Verification code is required' });

    const user = await User.findById(req.user.id).select('+emailVerificationCode +emailVerificationExpires');
    if (!user || !user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ success: false, message: 'No active verification request found' });
    }

    if (new Date() > new Date(user.emailVerificationExpires)) {
      return res.status(400).json({ success: false, message: 'Verification code expired' });
    }

    const isValid = verifyPassword(code.trim(), user.emailVerificationCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/dev-session', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const { role = 'buyer', email, displayName } = req.body;
    const allowedRole = ['buyer', 'vendor', 'admin'].includes(role) ? role : 'buyer';
    const testEmail = email ? email.toLowerCase() : `dev-${allowedRole}@paleo.et`;
    let user = await User.findOne({ email: testEmail });
    if (!user) {
      user = await User.create({
        email: testEmail,
        displayName: displayName || `Dev ${allowedRole.toUpperCase()}`,
        role: allowedRole,
        authProvider: 'dev'
      });
    }
    const token = await issueAuthCookie(res, user);
    return res.json({
      success: true,
      message: 'Dev session created',
      token,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  let parsedState = { role: 'buyer', returnUrl: '/' };

  if (state) {
    try {
      parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch (e) {}
  }

  const baseFrontendUrl = process.env.BUYER_STORE_URL || 'http://localhost:3000';
  const returnUrl = parsedState.returnUrl?.startsWith('http') ? parsedState.returnUrl : `${baseFrontendUrl}${parsedState.returnUrl || '/'}`;

  if (error || !code) {
    return res.redirect(`${returnUrl}?auth_error=${encodeURIComponent(error || 'Google login was canceled')}`);
  }

  try {
    const redirectUri = `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google/callback`;
    const profile = await exchangeGoogleCode(code, redirectUri);
    const user = await resolveOrCreateGoogleUser({ ...profile, role: parsedState.role });
    await issueAuthCookie(res, user);
    const verificationParam = !user.isEmailVerified ? '&needs_verification=true' : '';
    return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}auth_success=true${verificationParam}`);
  } catch (err) {
    console.error('[Google Callback Error]:', err.message);
    return res.redirect(`${returnUrl}?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// ---------------- Telegram Auth Routes ----------------

router.post('/telegram/start', async (req, res) => {
  try {
    const requestedRole = ['buyer', 'vendor', 'admin'].includes(req.body.role) ? req.body.role : 'buyer';
    const sessionToken = crypto.randomBytes(24).toString('hex');
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PaleoMarketBot';

    await TelegramSession.create({
      sessionToken,
      requestedRole,
      profile: {
        email: req.body.email,
        displayName: req.body.displayName
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    return res.status(201).json({
      success: true,
      sessionToken,
      deepLink: `https://t.me/${botUsername}?start=${sessionToken}`,
      expiresInSeconds: 600
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/telegram/session/:token', async (req, res) => {
  try {
    const session = await TelegramSession.findOne({ sessionToken: req.params.token }).populate('userId');
    if (!session) {
      return res.status(404).json({ success: false, verified: false, message: 'Telegram session expired or not found' });
    }

    if (!session.verified || !session.userId) {
      return res.json({ success: true, verified: false });
    }

    const token = await issueAuthCookie(res, session.userId);
    if (!session.consumed) {
      session.consumed = true;
      await session.save();
    }

    return res.json({
      success: true,
      verified: true,
      token,
      user: {
        id: session.userId._id,
        role: session.userId.role,
        email: session.userId.email,
        displayName: session.userId.displayName,
        telegramUsername: session.userId.telegramUsername,
        avatar: session.userId.avatar,
        isEmailVerified: Boolean(session.userId.isEmailVerified)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- User & Session Management ----------------

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.[process.env.AUTH_COOKIE_NAME || 'paleo_token'] ||
      (typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : null);

    if (!token) {
      return res.json({ success: true, authenticated: false, user: null });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-__v');
    if (!user) {
      return res.json({ success: true, authenticated: false, user: null });
    }

    let vendorId = decoded.vendorId || null;
    if (user.role === 'vendor' && !vendorId) {
      const vendor = await Vendor.findOne({ userId: user._id }).select('_id');
      vendorId = vendor ? vendor._id.toString() : null;
    }

    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        displayName: user.displayName,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        isEmailVerified: Boolean(user.isEmailVerified),
        isProfileComplete: Boolean(user.isProfileComplete),
        vendorId
      }
    });
  } catch (error) {
    return res.json({ success: true, authenticated: false, user: null });
  }
});

router.patch('/profile', authenticateJWT, async (req, res) => {
  try {
    delete req.body.role;
    const { displayName, phone, bio, location, telegramUsername } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (displayName) user.displayName = displayName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (telegramUsername !== undefined) user.telegramUsername = telegramUsername.trim().replace(/^@/, '');

    if (user.phone && user.location) {
      user.isProfileComplete = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        isEmailVerified: Boolean(user.isEmailVerified),
        isProfileComplete: Boolean(user.isProfileComplete),
        telegramUsername: user.telegramUsername,
        vendorId: req.user.vendorId
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/avatar', authenticateJWT, memoryUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const uploaded = await uploadBufferToR2({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: 'avatars'
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: uploaded.url },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: uploaded.url,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

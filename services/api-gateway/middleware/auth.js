const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'paleo_token';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is missing.');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
});

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const generateToken = (user, vendorId = null) => {
  return jwt.sign(
    {
      userId: (user._id || user.id).toString(),
      role: user.role,
      vendorId: vendorId ? vendorId.toString() : null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const issueAuthCookie = async (res, user) => {
  let vendorId = null;
  if (user.role === 'vendor') {
    const vendor = await Vendor.findOne({ userId: user._id || user.id }).select('_id');
    vendorId = vendor ? vendor._id.toString() : null;
  }

  const token = generateToken(user, vendorId);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
};

const clearAuthCookie = (res) => {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  };
  res.clearCookie(COOKIE_NAME, opts);
  res.clearCookie('token', opts);
  res.clearCookie('paleo_token', opts);
};

const authenticateJWT = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    let vendorId = decoded.vendorId || null;
    if (user.role === 'vendor' && !vendorId) {
      const vendor = await Vendor.findOne({ userId: user._id }).select('_id');
      vendorId = vendor ? vendor._id.toString() : null;
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
      email: user.email,
      telegramId: user.telegramId,
      displayName: user.displayName,
      vendorId
    };

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

const optionalAuthenticateJWT = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      req.user = null;
      return next();
    }

    let vendorId = decoded.vendorId || null;
    if (user.role === 'vendor' && !vendorId) {
      const vendor = await Vendor.findOne({ userId: user._id }).select('_id');
      vendorId = vendor ? vendor._id.toString() : null;
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
      email: user.email,
      telegramId: user.telegramId,
      displayName: user.displayName,
      vendorId
    };

    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

module.exports = {
  COOKIE_NAME,
  JWT_SECRET,
  generateToken,
  issueAuthCookie,
  clearAuthCookie,
  authenticateJWT,
  optionalAuthenticateJWT
};

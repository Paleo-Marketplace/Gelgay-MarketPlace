const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Hash a plaintext password using bcrypt with 10 salt rounds.
 * @param {string} password
 * @returns {string} bcrypt hash
 */
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

/**
 * Securely verify a plaintext password against a stored bcrypt hash or PBKDF2 salt:hash.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
const verifyPassword = (password, storedHash) => {
  if (!storedHash) return false;

  // bcrypt hash check ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, storedHash);
  }

  // PBKDF2 legacy fallback check
  if (storedHash.includes(':')) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  return false;
};

module.exports = {
  hashPassword,
  verifyPassword
};


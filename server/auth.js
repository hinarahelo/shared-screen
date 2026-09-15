const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  if (!password) return null;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  if (!hash) return true;
  if (!password) return false;
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword };

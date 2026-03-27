const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const formatDate = (date) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(date).toLocaleDateString('en-US', options);
};

const sanitizeUser = (user) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

const calculateStreak = (lastActive) => {
  const today = new Date();
  const lastDate = new Date(lastActive);
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 1 ? 1 : 0;
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidIICEmail = (email) => {
  return email.endsWith('@iic.edu.np');
};

const isValidAdminEmail = (email) => {
  return email === 'sankalpaparajuli274@gmail.com';
};

const paginate = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit) || 10));
  return {
    skip: (p - 1) * l,
    take: l,
  };
};

module.exports = {
  generateToken,
  generateOTP,
  generateResetToken,
  formatDate,
  sanitizeUser,
  calculateStreak,
  isValidEmail,
  isValidIICEmail,
  isValidAdminEmail,
  paginate,
};

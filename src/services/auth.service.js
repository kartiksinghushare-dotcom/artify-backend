const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// ── REGISTER ──────────────────────────────────────────────────────────
const register = async ({ name, email, phone, password }) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error('Email already registered');
    err.statusCode = 400;
    throw err;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'BUYER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      created_at: true
    }
  });

  // Generate tokens
  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  // Save refresh token to DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return { user, accessToken, refreshToken };
};

// ── LOGIN ─────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // Check if account is active
  if (!user.is_active) {
    const err = new Error('Account has been suspended');
    err.statusCode = 403;
    throw err;
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // Generate tokens
  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  // Save refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      user_id: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    },
    accessToken,
    refreshToken
  };
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────
const refresh = async (refreshToken) => {
  // Verify token
  const decoded = verifyRefreshToken(refreshToken);

  // Check if token exists in DB
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });

  if (!tokenRecord) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  // Check expiry
  if (new Date() > tokenRecord.expires_at) {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const err = new Error('Refresh token expired, please login again');
    err.statusCode = 401;
    throw err;
  }

  // Get user
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  // Generate new access token
  const accessToken = generateAccessToken({ id: user.id, role: user.role });

  return { accessToken };
};

// ── LOGOUT ────────────────────────────────────────────────────────────
const logout = async (refreshToken) => {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken }
  });
  return true;
};

module.exports = { register, login, refresh, logout };
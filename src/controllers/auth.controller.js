const authService = require('../services/auth.service');
const { success, error } = require('../utils/apiResponse');

// ── REGISTER ──────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return error(res, 'Name, email and password are required', 400);
    }

    if (password.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400);
    }

    const result = await authService.register({ name, email, phone, password });
    return success(res, result, 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required', 400);
    }

    const result = await authService.login({ email, password });
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, 'Refresh token is required', 400);
    }

    const result = await authService.refresh(refreshToken);
    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, 'Refresh token is required', 400);
    }

    await authService.logout(refreshToken);
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET CURRENT USER ──────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const prisma = require('../config/db');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        is_verified: true,
        created_at: true
      }
    });

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, user, 'User fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, me };
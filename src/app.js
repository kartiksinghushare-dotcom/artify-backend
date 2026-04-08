const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ── RATE LIMITING ─────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again after 15 minutes'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes'
  }
});

// ── SECURITY ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// ── LOGGING ───────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── RATE LIMITERS ─────────────────────────────────────────────────────
app.use(generalLimiter);
app.use('/api/v1/auth', authLimiter);

// ── PARSE JSON ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HEALTH CHECK ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    message: 'Artify India API is running 🎨',
    version: '1.0.0',
    status: 'healthy'
  });
});

// ── ROUTES ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/user', require('./routes/user.routes'));
app.use('/api/v1/categories', require('./routes/category.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));

// ── ERROR HANDLING ────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
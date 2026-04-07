const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Logging
app.use(morgan('dev'));

// Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Artify India API is running 🎨',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Routes
app.use('/api/v1/auth', require('./routes/auth.routes'));

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
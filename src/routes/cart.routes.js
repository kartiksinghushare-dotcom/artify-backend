const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  applyCoupon
} = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');

// Works for both logged in and guest users
router.get('/', optionalAuth, getCart);
router.post('/', optionalAuth, addToCart);
router.put('/:id', optionalAuth, updateCartItem);
router.delete('/:id', optionalAuth, removeFromCart);
router.delete('/', optionalAuth, clearCart);

// Logged in only
router.post('/merge', authenticate, mergeCart);
router.post('/coupon', applyCoupon);

// Optional auth middleware
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { verifyAccessToken } = require('../utils/jwt');
      req.user = verifyAccessToken(token);
    } catch (err) {
      // Token invalid — continue as guest
    }
  }
  next();
}

module.exports = router;
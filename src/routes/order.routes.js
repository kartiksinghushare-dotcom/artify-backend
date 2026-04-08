const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getOrderTracking
} = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');

// All order routes require authentication
router.use(authenticate);

router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/track', getOrderTracking);

module.exports = router;
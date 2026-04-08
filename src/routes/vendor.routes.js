const express = require('express');
const router = express.Router();
const {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  getDashboard,
  getVendorOrders,
  updateOrderStatus,
  getEarnings,
  requestPayout
} = require('../controllers/vendor.controller');
const { authenticate, authorise } = require('../middleware/auth');

// Register — any logged in user can apply
router.post('/register', authenticate, registerVendor);

// All routes below require VENDOR or ADMIN role
router.use(authenticate, authorise('VENDOR', 'ADMIN'));

router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);
router.get('/dashboard', getDashboard);
router.get('/orders', getVendorOrders);
router.put('/orders/:itemId/status', updateOrderStatus);
router.get('/earnings', getEarnings);
router.post('/payouts/request', requestPayout);

module.exports = router;
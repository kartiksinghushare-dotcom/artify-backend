const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateProfileValidator,
  changePasswordValidator,
  addAddressValidator
} = require('../middleware/validators/user.validator');

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidator, validate, updateProfile);
router.put('/change-password', changePasswordValidator, validate, changePassword);

// Addresses
router.get('/addresses', getAddresses);
router.post('/addresses', addAddressValidator, validate, addAddress);
router.put('/addresses/:id', addAddressValidator, validate, updateAddress);
router.delete('/addresses/:id', deleteAddress);

// Wishlist
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

module.exports = router;
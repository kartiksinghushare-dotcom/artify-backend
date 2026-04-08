const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  addReview
} = require('../controllers/product.controller');
const { authenticate, authorise } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProductValidator } = require('../middleware/validators/product.validator');

// Public routes
router.get('/', getAllProducts);
router.get('/:slug', getProductBySlug);
router.get('/:slug/related', getRelatedProducts);

// Vendor routes
router.post('/', authenticate, authorise('VENDOR', 'ADMIN'), createProductValidator, validate, createProduct);
router.put('/:id', authenticate, authorise('VENDOR', 'ADMIN'), updateProduct);
router.delete('/:id', authenticate, authorise('VENDOR', 'ADMIN'), deleteProduct);
router.get('/vendor/my-products', authenticate, authorise('VENDOR', 'ADMIN'), getVendorProducts);

// Review routes
router.post('/:id/reviews', authenticate, addReview);

module.exports = router;
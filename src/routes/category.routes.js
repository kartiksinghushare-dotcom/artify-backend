const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');
const { authenticate, authorise } = require('../middleware/auth');

// Public routes
router.get('/', getAllCategories);
router.get('/:slug', getCategoryBySlug);

// Admin only routes
router.post('/', authenticate, authorise('ADMIN'), createCategory);
router.put('/:id', authenticate, authorise('ADMIN'), updateCategory);
router.delete('/:id', authenticate, authorise('ADMIN'), deleteCategory);

module.exports = router;
const categoryService = require('../services/category.service');
const { success, error } = require('../utils/apiResponse');

// ── GET ALL CATEGORIES ────────────────────────────────────────────────
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    return success(res, categories, 'Categories fetched');
  } catch (err) {
    next(err);
  }
};

// ── GET SINGLE CATEGORY ───────────────────────────────────────────────
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    return success(res, category, 'Category fetched');
  } catch (err) {
    next(err);
  }
};

// ── CREATE CATEGORY ───────────────────────────────────────────────────
const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    return success(res, category, 'Category created', 201);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE CATEGORY ───────────────────────────────────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return success(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
};

// ── DELETE CATEGORY ───────────────────────────────────────────────────
const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    return success(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
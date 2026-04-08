const productService = require('../services/product.service');
const { success, error } = require('../utils/apiResponse');

// ── GET ALL PRODUCTS ──────────────────────────────────────────────────
const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    return success(res, result, 'Products fetched');
  } catch (err) {
    next(err);
  }
};

// ── GET SINGLE PRODUCT ────────────────────────────────────────────────
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    return success(res, product, 'Product fetched');
  } catch (err) {
    next(err);
  }
};

// ── GET RELATED PRODUCTS ──────────────────────────────────────────────
const getRelatedProducts = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    const related = await productService.getRelatedProducts(product.id, product.category_id);
    return success(res, related, 'Related products fetched');
  } catch (err) {
    next(err);
  }
};

// ── CREATE PRODUCT (vendor) ───────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const prisma = require('../config/db');

    // Get vendor profile
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return error(res, 'Vendor profile not found. Please complete vendor registration.', 404);
    }

    if (vendor.status !== 'APPROVED') {
      return error(res, 'Your vendor account is not approved yet.', 403);
    }

    const product = await productService.createProduct(vendor.id, req.body);
    return success(res, product, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE PRODUCT (vendor) ───────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const prisma = require('../config/db');

    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return error(res, 'Vendor profile not found', 404);
    }

    const product = await productService.updateProduct(vendor.id, req.params.id, req.body);
    return success(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
};

// ── DELETE PRODUCT (vendor) ───────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const prisma = require('../config/db');

    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return error(res, 'Vendor profile not found', 404);
    }

    await productService.deleteProduct(vendor.id, req.params.id);
    return success(res, null, 'Product deleted');
  } catch (err) {
    next(err);
  }
};

// ── GET VENDOR PRODUCTS ───────────────────────────────────────────────
const getVendorProducts = async (req, res, next) => {
  try {
    const prisma = require('../config/db');

    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return error(res, 'Vendor profile not found', 404);
    }

    const result = await productService.getVendorProducts(vendor.id, req.query);
    return success(res, result, 'Vendor products fetched');
  } catch (err) {
    next(err);
  }
};

// ── ADD REVIEW ────────────────────────────────────────────────────────
const addReview = async (req, res, next) => {
  try {
    const { rating, title, comment, images } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return error(res, 'Rating must be between 1 and 5', 400);
    }

    const review = await productService.addReview(
      req.user.id,
      req.params.id,
      { rating, title, comment, images }
    );

    return success(res, review, 'Review added', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  addReview
};
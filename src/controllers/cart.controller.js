const cartService = require('../services/cart.service');
const { success, error } = require('../utils/apiResponse');

// Helper to get userId and sessionId
const getIdentifiers = (req) => ({
  userId: req.user?.id || null,
  sessionId: req.headers['x-session-id'] || null
});

// ── GET CART ──────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const { userId, sessionId } = getIdentifiers(req);

    if (!userId && !sessionId) {
      return success(res, { items: [], total: 0, count: 0 }, 'Cart is empty');
    }

    const cart = await cartService.getCart(userId, sessionId);
    return success(res, cart, 'Cart fetched');
  } catch (err) {
    next(err);
  }
};

// ── ADD TO CART ───────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { userId, sessionId } = getIdentifiers(req);

    if (!userId && !sessionId) {
      return error(res, 'Session ID required for guest cart', 400);
    }

    const { product_id, variant_id, quantity, design_data, design_preview } = req.body;

    if (!product_id) {
      return error(res, 'Product ID is required', 400);
    }

    const item = await cartService.addToCart(userId, sessionId, {
      product_id,
      variant_id,
      quantity: quantity || 1,
      design_data,
      design_preview
    });

    return success(res, item, 'Added to cart', 201);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE CART ITEM ──────────────────────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { userId, sessionId } = getIdentifiers(req);
    const { quantity } = req.body;

    if (!quantity) {
      return error(res, 'Quantity is required', 400);
    }

    const item = await cartService.updateCartItem(
      userId,
      sessionId,
      req.params.id,
      parseInt(quantity)
    );

    return success(res, item, item ? 'Cart updated' : 'Item removed from cart');
  } catch (err) {
    next(err);
  }
};

// ── REMOVE FROM CART ──────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { userId, sessionId } = getIdentifiers(req);
    await cartService.removeFromCart(userId, sessionId, req.params.id);
    return success(res, null, 'Item removed from cart');
  } catch (err) {
    next(err);
  }
};

// ── CLEAR CART ────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const { userId, sessionId } = getIdentifiers(req);
    await cartService.clearCart(userId, sessionId);
    return success(res, null, 'Cart cleared');
  } catch (err) {
    next(err);
  }
};

// ── MERGE CART ────────────────────────────────────────────────────────
const mergeCart = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    await cartService.mergeCart(req.user.id, sessionId);
    return success(res, null, 'Cart merged successfully');
  } catch (err) {
    next(err);
  }
};

// ── APPLY COUPON ──────────────────────────────────────────────────────
const applyCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) return error(res, 'Coupon code is required', 400);
    if (!cartTotal) return error(res, 'Cart total is required', 400);

    const result = await cartService.applyCoupon(code, parseFloat(cartTotal));
    return success(res, result, 'Coupon applied successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  applyCoupon
};
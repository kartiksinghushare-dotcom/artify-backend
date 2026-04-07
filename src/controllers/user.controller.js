const userService = require('../services/user.service');
const { success, error } = require('../utils/apiResponse');

// ── GET PROFILE ───────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);
    return success(res, user, 'Profile fetched');
  } catch (err) {
    next(err);
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await userService.updateProfile(req.user.id, { name, phone, avatar });
    return success(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, { currentPassword, newPassword });
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET ADDRESSES ─────────────────────────────────────────────────────
const getAddresses = async (req, res, next) => {
  try {
    const addresses = await userService.getAddresses(req.user.id);
    return success(res, addresses, 'Addresses fetched');
  } catch (err) {
    next(err);
  }
};

// ── ADD ADDRESS ───────────────────────────────────────────────────────
const addAddress = async (req, res, next) => {
  try {
    const address = await userService.addAddress(req.user.id, req.body);
    return success(res, address, 'Address added', 201);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE ADDRESS ────────────────────────────────────────────────────
const updateAddress = async (req, res, next) => {
  try {
    const address = await userService.updateAddress(req.user.id, req.params.id, req.body);
    return success(res, address, 'Address updated');
  } catch (err) {
    next(err);
  }
};

// ── DELETE ADDRESS ────────────────────────────────────────────────────
const deleteAddress = async (req, res, next) => {
  try {
    await userService.deleteAddress(req.user.id, req.params.id);
    return success(res, null, 'Address deleted');
  } catch (err) {
    next(err);
  }
};

// ── GET WISHLIST ──────────────────────────────────────────────────────
const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await userService.getWishlist(req.user.id);
    return success(res, wishlist, 'Wishlist fetched');
  } catch (err) {
    next(err);
  }
};

// ── ADD TO WISHLIST ───────────────────────────────────────────────────
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return error(res, 'Product ID is required', 400);
    const item = await userService.addToWishlist(req.user.id, productId);
    return success(res, item, 'Added to wishlist', 201);
  } catch (err) {
    next(err);
  }
};

// ── REMOVE FROM WISHLIST ──────────────────────────────────────────────
const removeFromWishlist = async (req, res, next) => {
  try {
    await userService.removeFromWishlist(req.user.id, req.params.productId);
    return success(res, null, 'Removed from wishlist');
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
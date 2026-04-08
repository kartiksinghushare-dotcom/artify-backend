const orderService = require('../services/order.service');
const { success, error } = require('../utils/apiResponse');

// ── CREATE ORDER ──────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { address_id, coupon_id, notes } = req.body;

    if (!address_id) {
      return error(res, 'Delivery address is required', 400);
    }

    const order = await orderService.createOrder(req.user.id, {
      address_id,
      coupon_id,
      notes
    });

    return success(res, order, 'Order placed successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET USER ORDERS ───────────────────────────────────────────────────
const getUserOrders = async (req, res, next) => {
  try {
    const result = await orderService.getUserOrders(req.user.id, req.query);
    return success(res, result, 'Orders fetched');
  } catch (err) {
    next(err);
  }
};

// ── GET SINGLE ORDER ──────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.user.id, req.params.id);
    return success(res, order, 'Order fetched');
  } catch (err) {
    next(err);
  }
};

// ── CANCEL ORDER ──────────────────────────────────────────────────────
const cancelOrder = async (req, res, next) => {
  try {
    await orderService.cancelOrder(req.user.id, req.params.id);
    return success(res, null, 'Order cancelled successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET ORDER TRACKING ────────────────────────────────────────────────
const getOrderTracking = async (req, res, next) => {
  try {
    const tracking = await orderService.getOrderTracking(req.user.id, req.params.id);
    return success(res, tracking, 'Tracking info fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getOrderTracking
};
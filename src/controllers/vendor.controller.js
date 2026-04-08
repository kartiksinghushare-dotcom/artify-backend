const vendorService = require('../services/vendor.service');
const { success, error } = require('../utils/apiResponse');

// ── REGISTER VENDOR ───────────────────────────────────────────────────
const registerVendor = async (req, res, next) => {
  try {
    const {
      shop_name, description, gst_number,
      pan_number, aadhaar_number,
      bank_account, bank_ifsc, bank_name, account_holder
    } = req.body;

    if (!shop_name) {
      return error(res, 'Shop name is required', 400);
    }

    const vendor = await vendorService.registerVendor(req.user.id, {
      shop_name, description, gst_number,
      pan_number, aadhaar_number,
      bank_account, bank_ifsc, bank_name, account_holder
    });

    return success(res, vendor, 'Vendor registration submitted. Pending approval.', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET VENDOR PROFILE ────────────────────────────────────────────────
const getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorProfile(req.user.id);
    return success(res, vendor, 'Vendor profile fetched');
  } catch (err) {
    next(err);
  }
};

// ── UPDATE VENDOR PROFILE ─────────────────────────────────────────────
const updateVendorProfile = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendorProfile(req.user.id, req.body);
    return success(res, vendor, 'Vendor profile updated');
  } catch (err) {
    next(err);
  }
};

// ── GET DASHBOARD ─────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await vendorService.getDashboard(req.user.id);
    return success(res, dashboard, 'Dashboard fetched');
  } catch (err) {
    next(err);
  }
};

// ── GET VENDOR ORDERS ─────────────────────────────────────────────────
const getVendorOrders = async (req, res, next) => {
  try {
    const result = await vendorService.getVendorOrders(req.user.id, req.query);
    return success(res, result, 'Orders fetched');
  } catch (err) {
    next(err);
  }
};

// ── UPDATE ORDER STATUS ───────────────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'];

    if (!status || !validStatuses.includes(status)) {
      return error(res, `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await vendorService.updateOrderStatus(
      req.user.id,
      req.params.itemId,
      status
    );

    return success(res, order, 'Order status updated');
  } catch (err) {
    next(err);
  }
};

// ── GET EARNINGS ──────────────────────────────────────────────────────
const getEarnings = async (req, res, next) => {
  try {
    const result = await vendorService.getEarnings(req.user.id, req.query);
    return success(res, result, 'Earnings fetched');
  } catch (err) {
    next(err);
  }
};

// ── REQUEST PAYOUT ────────────────────────────────────────────────────
const requestPayout = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return error(res, 'Valid amount is required', 400);
    }

    const payout = await vendorService.requestPayout(req.user.id, parseFloat(amount));
    return success(res, payout, 'Payout requested successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  getDashboard,
  getVendorOrders,
  updateOrderStatus,
  getEarnings,
  requestPayout
};
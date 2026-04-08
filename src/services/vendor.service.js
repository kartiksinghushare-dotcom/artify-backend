const prisma = require('../config/db');

// ── GET VENDOR PROFILE ────────────────────────────────────────────────
const getVendorProfile = async (userId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { user_id: userId },
    include: {
      user: {
        select: { name: true, email: true, phone: true, avatar: true }
      }
    }
  });

  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  return vendor;
};

// ── UPDATE VENDOR PROFILE ─────────────────────────────────────────────
const updateVendorProfile = async (userId, data) => {
  const vendor = await prisma.vendor.findUnique({
    where: { user_id: userId }
  });

  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  return await prisma.vendor.update({
    where: { user_id: userId },
    data: {
      ...(data.shop_name && { shop_name: data.shop_name }),
      ...(data.description && { description: data.description }),
      ...(data.logo && { logo: data.logo }),
      ...(data.bank_account && { bank_account: data.bank_account }),
      ...(data.bank_ifsc && { bank_ifsc: data.bank_ifsc }),
      ...(data.bank_name && { bank_name: data.bank_name }),
      ...(data.account_holder && { account_holder: data.account_holder }),
    }
  });
};

// ── REGISTER VENDOR ───────────────────────────────────────────────────
const registerVendor = async (userId, {
  shop_name, description, gst_number,
  pan_number, aadhaar_number,
  bank_account, bank_ifsc, bank_name, account_holder
}) => {
  // Check if already registered
  const existing = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (existing) {
    const err = new Error('Vendor profile already exists');
    err.statusCode = 400;
    throw err;
  }

  // Create vendor and update user role in transaction
  const vendor = await prisma.$transaction(async (tx) => {
    const newVendor = await tx.vendor.create({
      data: {
        user_id: userId,
        shop_name,
        description,
        gst_number,
        pan_number,
        aadhaar_number,
        bank_account,
        bank_ifsc,
        bank_name,
        account_holder,
        status: 'PENDING'
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: 'VENDOR' }
    });

    return newVendor;
  });

  return vendor;
};

// ── VENDOR DASHBOARD ──────────────────────────────────────────────────
const getDashboard = async (userId) => {
  const vendor = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const vendorId = vendor.id;

  // Get stats in parallel
  const [
    totalProducts,
    pendingOrders,
    totalOrderItems,
    totalEarnings,
    recentOrders
  ] = await Promise.all([
    // Total products
    prisma.product.count({ where: { vendor_id: vendorId } }),

    // Pending orders
    prisma.orderItem.count({
      where: {
        vendor_id: vendorId,
        order: { status: 'CONFIRMED' }
      }
    }),

    // Total orders
    prisma.orderItem.count({ where: { vendor_id: vendorId } }),

    // Total earnings
    prisma.orderItem.aggregate({
      where: {
        vendor_id: vendorId,
        order: { payment_status: 'PAID' }
      },
      _sum: { price: true }
    }),

    // Recent orders
    prisma.orderItem.findMany({
      where: { vendor_id: vendorId },
      take: 5,
      orderBy: { order: { created_at: 'desc' } },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            created_at: true,
            user: { select: { name: true } }
          }
        },
        product: { select: { name: true } },
        variant: { select: { size: true, colour: true } }
      }
    })
  ]);

  const grossEarnings = totalEarnings._sum.price || 0;
  const commission = (grossEarnings * vendor.commission_rate) / 100;
  const netEarnings = grossEarnings - commission;

  return {
    shop_name: vendor.shop_name,
    status: vendor.status,
    stats: {
      total_products: totalProducts,
      pending_orders: pendingOrders,
      total_orders: totalOrderItems,
      gross_earnings: grossEarnings,
      commission,
      net_earnings: netEarnings
    },
    recent_orders: recentOrders
  };
};

// ── GET VENDOR ORDERS ─────────────────────────────────────────────────
const getVendorOrders = async (userId, { page = 1, limit = 10, status }) => {
  const vendor = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const skip = (page - 1) * limit;

  const where = {
    vendor_id: vendor.id,
    ...(status && { order: { status } })
  };

  const [orders, total] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { order: { created_at: 'desc' } },
      include: {
        order: {
          include: {
            address: true,
            user: { select: { name: true, phone: true } }
          }
        },
        product: {
          include: { images: { where: { is_primary: true } } }
        },
        variant: true
      }
    }),
    prisma.orderItem.count({ where })
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

// ── UPDATE ORDER STATUS ───────────────────────────────────────────────
const updateOrderStatus = async (userId, orderItemId, status) => {
  const vendor = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: { id: orderItemId, vendor_id: vendor.id }
  });

  if (!orderItem) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Update the main order status
  return await prisma.order.update({
    where: { id: orderItem.order_id },
    data: { status }
  });
};

// ── GET EARNINGS ──────────────────────────────────────────────────────
const getEarnings = async (userId, { page = 1, limit = 10 }) => {
  const vendor = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  const skip = (page - 1) * limit;

  const [payouts, total, pendingBalance] = await Promise.all([
    prisma.payout.findMany({
      where: { vendor_id: vendor.id },
      skip,
      take: parseInt(limit),
      orderBy: { requested_at: 'desc' }
    }),
    prisma.payout.count({ where: { vendor_id: vendor.id } }),
    prisma.orderItem.aggregate({
      where: {
        vendor_id: vendor.id,
        order: { payment_status: 'PAID' }
      },
      _sum: { price: true }
    })
  ]);

  const grossEarnings = pendingBalance._sum.price || 0;
  const commission = (grossEarnings * vendor.commission_rate) / 100;
  const netEarnings = grossEarnings - commission;

  return {
    balance: {
      gross: grossEarnings,
      commission,
      net: netEarnings
    },
    payouts,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

// ── REQUEST PAYOUT ────────────────────────────────────────────────────
const requestPayout = async (userId, amount) => {
  const vendor = await prisma.vendor.findUnique({ where: { user_id: userId } });
  if (!vendor) {
    const err = new Error('Vendor profile not found');
    err.statusCode = 404;
    throw err;
  }

  if (!vendor.bank_account || !vendor.bank_ifsc) {
    const err = new Error('Please add bank account details before requesting payout');
    err.statusCode = 400;
    throw err;
  }

  const commission = (amount * vendor.commission_rate) / 100;
  const net_amount = amount - commission;

  return await prisma.payout.create({
    data: {
      vendor_id: vendor.id,
      amount,
      commission,
      net_amount,
      status: 'PENDING'
    }
  });
};

module.exports = {
  getVendorProfile,
  updateVendorProfile,
  registerVendor,
  getDashboard,
  getVendorOrders,
  updateOrderStatus,
  getEarnings,
  requestPayout
};
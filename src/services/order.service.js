const prisma = require('../config/db');

// ── CREATE ORDER ──────────────────────────────────────────────────────
const createOrder = async (userId, { address_id, coupon_id, notes }) => {
  // Get cart items
  const cartItems = await prisma.cart.findMany({
    where: { user_id: userId },
    include: {
      product: true,
      variant: true
    }
  });

  if (cartItems.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    throw err;
  }

  // Verify address belongs to user
  const address = await prisma.address.findFirst({
    where: { id: address_id, user_id: userId }
  });

  if (!address) {
    const err = new Error('Address not found');
    err.statusCode = 404;
    throw err;
  }

  // Calculate totals
  let subtotal = 0;
  for (const item of cartItems) {
    const price = item.variant ? item.variant.price : 0;
    subtotal += price * item.quantity;

    // Check stock
    if (item.variant && item.variant.stock < item.quantity) {
      const err = new Error(`Not enough stock for ${item.product.name}`);
      err.statusCode = 400;
      throw err;
    }
  }

  // Apply coupon if provided
  let discount = 0;
  if (coupon_id) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: coupon_id }
    });
    if (coupon && coupon.is_active) {
      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * coupon.value) / 100;
      } else {
        discount = coupon.value;
      }
      // Increment coupon usage
      await prisma.coupon.update({
        where: { id: coupon_id },
        data: { used_count: { increment: 1 } }
      });
    }
  }

  const shipping_fee = subtotal > 999 ? 0 : 99; // Free shipping above ₹999
  const total = subtotal - discount + shipping_fee;

  // Create order with items in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        user_id: userId,
        address_id,
        coupon_id: coupon_id || null,
        status: 'PENDING',
        subtotal,
        discount,
        shipping_fee,
        total,
        payment_status: 'PENDING',
        notes: notes || null,
        items: {
          create: cartItems.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            vendor_id: item.product.vendor_id,
            quantity: item.quantity,
            price: item.variant ? item.variant.price : 0,
            design_data: item.design_data,
            design_preview: item.design_preview
          }))
        }
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            variant: true
          }
        },
        address: true
      }
    });

    // Deduct stock
    for (const item of cartItems) {
      if (item.variant_id) {
        await tx.productVariant.update({
          where: { id: item.variant_id },
          data: { stock: { decrement: item.quantity } }
        });
      }
    }

    // Clear cart
    await tx.cart.deleteMany({ where: { user_id: userId } });

    return newOrder;
  });

  return order;
};

// ── GET USER ORDERS ───────────────────────────────────────────────────
const getUserOrders = async (userId, { page = 1, limit = 10, status }) => {
  const skip = (page - 1) * limit;

  const where = {
    user_id: userId,
    ...(status && { status })
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { created_at: 'desc' },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { is_primary: true } } }
            },
            variant: true
          }
        },
        payment: true,
        shipment: true
      }
    }),
    prisma.order.count({ where })
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

// ── GET SINGLE ORDER ──────────────────────────────────────────────────
const getOrderById = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { where: { is_primary: true } } }
          },
          variant: true,
          vendor: { select: { shop_name: true } }
        }
      },
      address: true,
      payment: true,
      shipment: true,
      coupon: true
    }
  });

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  return order;
};

// ── CANCEL ORDER ──────────────────────────────────────────────────────
const cancelOrder = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: { items: true }
  });

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    const err = new Error('Order cannot be cancelled at this stage');
    err.statusCode = 400;
    throw err;
  }

  // Cancel and restore stock in transaction
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    });

    // Restore stock
    for (const item of order.items) {
      if (item.variant_id) {
        await tx.productVariant.update({
          where: { id: item.variant_id },
          data: { stock: { increment: item.quantity } }
        });
      }
    }
  });

  return true;
};

// ── GET TRACKING ──────────────────────────────────────────────────────
const getOrderTracking = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: { shipment: true }
  });

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    order_status: order.status,
    payment_status: order.payment_status,
    shipment: order.shipment
  };
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getOrderTracking
};
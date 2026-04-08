const prisma = require('../config/db');

// ── GET CART ──────────────────────────────────────────────────────────
const getCart = async (userId, sessionId) => {
  const where = userId ? { user_id: userId } : { session_id: sessionId };

  const items = await prisma.cart.findMany({
    where,
    include: {
      product: {
        include: {
          images: { where: { is_primary: true } },
          vendor: { select: { shop_name: true } }
        }
      },
      variant: true
    },
    orderBy: { created_at: 'desc' }
  });

  // Calculate total
  const total = items.reduce((sum, item) => {
    const price = item.variant ? item.variant.price : 0;
    return sum + (price * item.quantity);
  }, 0);

  return { items, total, count: items.length };
};

// ── ADD TO CART ───────────────────────────────────────────────────────
const addToCart = async (userId, sessionId, { product_id, variant_id, quantity, design_data, design_preview }) => {
  const where = userId
    ? { user_id: userId }
    : { session_id: sessionId };

  // Check if product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: product_id },
    include: { variants: true }
  });

  if (!product || product.status !== 'ACTIVE') {
    const err = new Error('Product not found or not available');
    err.statusCode = 404;
    throw err;
  }

  // Check stock if variant provided
  if (variant_id) {
    const variant = product.variants.find(v => v.id === variant_id);
    if (!variant) {
      const err = new Error('Variant not found');
      err.statusCode = 404;
      throw err;
    }
    if (variant.stock < quantity) {
      const err = new Error(`Only ${variant.stock} items available in stock`);
      err.statusCode = 400;
      throw err;
    }
  }

  // Check if same item already in cart
  const existing = await prisma.cart.findFirst({
    where: {
      ...where,
      product_id,
      variant_id: variant_id || null,
      // If customised product, always add as new item
      ...(design_data ? {} : {})
    }
  });

  if (existing && !design_data) {
    // Update quantity
    return await prisma.cart.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + (quantity || 1) },
      include: {
        product: { include: { images: { where: { is_primary: true } } } },
        variant: true
      }
    });
  }

  // Add new item
  return await prisma.cart.create({
    data: {
      user_id: userId || null,
      session_id: sessionId || null,
      product_id,
      variant_id: variant_id || null,
      quantity: quantity || 1,
      design_data: design_data || null,
      design_preview: design_preview || null
    },
    include: {
      product: { include: { images: { where: { is_primary: true } } } },
      variant: true
    }
  });
};

// ── UPDATE CART ITEM ──────────────────────────────────────────────────
const updateCartItem = async (userId, sessionId, itemId, quantity) => {
  const where = userId ? { user_id: userId } : { session_id: sessionId };

  const item = await prisma.cart.findFirst({
    where: { id: itemId, ...where }
  });

  if (!item) {
    const err = new Error('Cart item not found');
    err.statusCode = 404;
    throw err;
  }

  if (quantity <= 0) {
    await prisma.cart.delete({ where: { id: itemId } });
    return null;
  }

  return await prisma.cart.update({
    where: { id: itemId },
    data: { quantity },
    include: { variant: true }
  });
};

// ── REMOVE FROM CART ──────────────────────────────────────────────────
const removeFromCart = async (userId, sessionId, itemId) => {
  const where = userId ? { user_id: userId } : { session_id: sessionId };

  const item = await prisma.cart.findFirst({
    where: { id: itemId, ...where }
  });

  if (!item) {
    const err = new Error('Cart item not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.cart.delete({ where: { id: itemId } });
  return true;
};

// ── CLEAR CART ────────────────────────────────────────────────────────
const clearCart = async (userId, sessionId) => {
  const where = userId ? { user_id: userId } : { session_id: sessionId };
  await prisma.cart.deleteMany({ where });
  return true;
};

// ── MERGE GUEST CART ──────────────────────────────────────────────────
const mergeCart = async (userId, sessionId) => {
  if (!sessionId) return;

  const guestItems = await prisma.cart.findMany({
    where: { session_id: sessionId }
  });

  for (const item of guestItems) {
    const existing = await prisma.cart.findFirst({
      where: {
        user_id: userId,
        product_id: item.product_id,
        variant_id: item.variant_id
      }
    });

    if (existing) {
      await prisma.cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity }
      });
      await prisma.cart.delete({ where: { id: item.id } });
    } else {
      await prisma.cart.update({
        where: { id: item.id },
        data: { user_id: userId, session_id: null }
      });
    }
  }

  return true;
};

// ── APPLY COUPON ──────────────────────────────────────────────────────
const applyCoupon = async (code, cartTotal) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (!coupon || !coupon.is_active) {
    const err = new Error('Invalid or expired coupon');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > coupon.valid_to) {
    const err = new Error('Coupon has expired');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() < coupon.valid_from) {
    const err = new Error('Coupon is not active yet');
    err.statusCode = 400;
    throw err;
  }

  if (cartTotal < coupon.min_order) {
    const err = new Error(`Minimum order amount of ₹${coupon.min_order} required`);
    err.statusCode = 400;
    throw err;
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    const err = new Error('Coupon usage limit reached');
    err.statusCode = 400;
    throw err;
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = (cartTotal * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  return {
    coupon_id: coupon.id,
    code: coupon.code,
    discount: Math.min(discount, cartTotal),
    type: coupon.type,
    value: coupon.value
  };
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
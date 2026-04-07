const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

// ── GET PROFILE ───────────────────────────────────────────────────────
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      is_verified: true,
      created_at: true,
    }
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────
const updateProfile = async (userId, { name, phone, avatar }) => {
  // Check if phone already taken by another user
  if (phone) {
    const existing = await prisma.user.findFirst({
      where: { phone, NOT: { id: userId } }
    });
    if (existing) {
      const err = new Error('Phone number already in use');
      err.statusCode = 400;
      throw err;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(avatar && { avatar }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
    }
  });

  return user;
};

// ── CHANGE PASSWORD ───────────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.password) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return true;
};

// ── GET ADDRESSES ─────────────────────────────────────────────────────
const getAddresses = async (userId) => {
  return await prisma.address.findMany({
    where: { user_id: userId },
    orderBy: { is_default: 'desc' }
  });
};

// ── ADD ADDRESS ───────────────────────────────────────────────────────
const addAddress = async (userId, addressData) => {
  // If this is set as default, remove default from others
  if (addressData.is_default) {
    await prisma.address.updateMany({
      where: { user_id: userId },
      data: { is_default: false }
    });
  }

  // If no addresses exist, make this default
  const count = await prisma.address.count({ where: { user_id: userId } });
  if (count === 0) addressData.is_default = true;

  return await prisma.address.create({
    data: { ...addressData, user_id: userId }
  });
};

// ── UPDATE ADDRESS ────────────────────────────────────────────────────
const updateAddress = async (userId, addressId, addressData) => {
  const address = await prisma.address.findFirst({
    where: { id: addressId, user_id: userId }
  });

  if (!address) {
    const err = new Error('Address not found');
    err.statusCode = 404;
    throw err;
  }

  if (addressData.is_default) {
    await prisma.address.updateMany({
      where: { user_id: userId },
      data: { is_default: false }
    });
  }

  return await prisma.address.update({
    where: { id: addressId },
    data: addressData
  });
};

// ── DELETE ADDRESS ────────────────────────────────────────────────────
const deleteAddress = async (userId, addressId) => {
  const address = await prisma.address.findFirst({
    where: { id: addressId, user_id: userId }
  });

  if (!address) {
    const err = new Error('Address not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.address.delete({ where: { id: addressId } });
  return true;
};

// ── GET WISHLIST ──────────────────────────────────────────────────────
const getWishlist = async (userId) => {
  return await prisma.wishlist.findMany({
    where: { user_id: userId },
    include: {
      product: {
        include: {
          images: { where: { is_primary: true } },
          variants: { take: 1, orderBy: { price: 'asc' } },
          vendor: { select: { shop_name: true } }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

// ── ADD TO WISHLIST ───────────────────────────────────────────────────
const addToWishlist = async (userId, productId) => {
  const existing = await prisma.wishlist.findUnique({
    where: { user_id_product_id: { user_id: userId, product_id: productId } }
  });

  if (existing) {
    const err = new Error('Product already in wishlist');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.wishlist.create({
    data: { user_id: userId, product_id: productId }
  });
};

// ── REMOVE FROM WISHLIST ──────────────────────────────────────────────
const removeFromWishlist = async (userId, productId) => {
  await prisma.wishlist.deleteMany({
    where: { user_id: userId, product_id: productId }
  });
  return true;
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
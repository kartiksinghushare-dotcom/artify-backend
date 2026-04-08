const prisma = require('../config/db');

// ── CREATE PRODUCT (vendor) ───────────────────────────────────────────
const createProduct = async (vendorId, { name, description, category_id, is_customisable, customisation_info, tags, occasions, variants, images }) => {
  // Generate slug from name
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now();

  const product = await prisma.product.create({
    data: {
      vendor_id: vendorId,
      category_id,
      name,
      slug,
      description,
      is_customisable: is_customisable ?? true,
      customisation_info,
      tags: tags || [],
      occasions: occasions || [],
      variants: {
        create: variants.map(v => ({
          size: v.size,
          colour: v.colour,
          material: v.material,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock || 0,
          weight: v.weight
        }))
      },
      images: images ? {
        create: images.map((url, index) => ({
          url,
          is_primary: index === 0,
          display_order: index
        }))
      } : undefined
    },
    include: {
      variants: true,
      images: true,
      category: true
    }
  });

  return product;
};

// ── GET ALL PRODUCTS ──────────────────────────────────────────────────
const getAllProducts = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    is_customisable,
    occasion,
    search,
    sortBy = 'created_at',
    order = 'desc',
    is_featured,
    is_trending
  } = filters;

  const skip = (page - 1) * limit;

  const where = {
    status: 'ACTIVE',
    ...(category && { category: { slug: category } }),
    ...(is_customisable !== undefined && { is_customisable: is_customisable === 'true' }),
    ...(is_featured && { is_featured: true }),
    ...(is_trending && { is_trending: true }),
    ...(occasion && { occasions: { has: occasion } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }),
    ...(minPrice || maxPrice) && {
      variants: {
        some: {
          ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
          ...(maxPrice && { price: { lte: parseFloat(maxPrice) } })
        }
      }
    }
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: order },
      include: {
        images: { where: { is_primary: true } },
        variants: { orderBy: { price: 'asc' }, take: 1 },
        vendor: { select: { shop_name: true, id: true } },
        category: { select: { name: true, slug: true } },
        reviews: { select: { rating: true } }
      }
    }),
    prisma.product.count({ where })
  ]);

  // Calculate average rating for each product
  const productsWithRating = products.map(product => {
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;
    return {
      ...product,
      avg_rating: Math.round(avgRating * 10) / 10,
      review_count: product.reviews.length,
      reviews: undefined
    };
  });

  return {
    products: productsWithRating,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

// ── GET SINGLE PRODUCT ────────────────────────────────────────────────
const getProductBySlug = async (slug) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: true,
      images: { orderBy: { display_order: 'asc' } },
      vendor: {
        select: {
          id: true,
          shop_name: true,
          description: true,
          logo: true
        }
      },
      category: true,
      customisation_template: true,
      reviews: {
        include: {
          user: { select: { name: true, avatar: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }
    }
  });

  if (!product || product.status !== 'ACTIVE') {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  // Calculate average rating
  const avgRating = product.reviews.length > 0
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : 0;

  return {
    ...product,
    avg_rating: Math.round(avgRating * 10) / 10,
    review_count: product.reviews.length
  };
};

// ── GET RELATED PRODUCTS ──────────────────────────────────────────────
const getRelatedProducts = async (productId, categoryId) => {
  return await prisma.product.findMany({
    where: {
      category_id: categoryId,
      status: 'ACTIVE',
      NOT: { id: productId }
    },
    take: 8,
    include: {
      images: { where: { is_primary: true } },
      variants: { orderBy: { price: 'asc' }, take: 1 },
      vendor: { select: { shop_name: true } }
    }
  });
};

// ── GET VENDOR PRODUCTS ───────────────────────────────────────────────
const getVendorProducts = async (vendorId, filters = {}) => {
  const { page = 1, limit = 20, status } = filters;
  const skip = (page - 1) * limit;

  const where = {
    vendor_id: vendorId,
    ...(status && { status })
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { created_at: 'desc' },
      include: {
        images: { where: { is_primary: true } },
        variants: true,
        category: { select: { name: true } }
      }
    }),
    prisma.product.count({ where })
  ]);

  return {
    products,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

// ── UPDATE PRODUCT ────────────────────────────────────────────────────
const updateProduct = async (vendorId, productId, data) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendor_id: vendorId }
  });

  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  return await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.category_id && { category_id: data.category_id }),
      ...(data.is_customisable !== undefined && { is_customisable: data.is_customisable }),
      ...(data.customisation_info && { customisation_info: data.customisation_info }),
      ...(data.tags && { tags: data.tags }),
      ...(data.occasions && { occasions: data.occasions }),
      ...(data.status && { status: data.status }),
    },
    include: { variants: true, images: true }
  });
};

// ── DELETE PRODUCT ────────────────────────────────────────────────────
const deleteProduct = async (vendorId, productId) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendor_id: vendorId }
  });

  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.product.update({
    where: { id: productId },
    data: { status: 'INACTIVE' }
  });

  return true;
};

// ── ADD REVIEW ────────────────────────────────────────────────────────
const addReview = async (userId, productId, { rating, title, comment, images }) => {
  // Check if user already reviewed
  const existing = await prisma.review.findFirst({
    where: { user_id: userId, product_id: productId }
  });

  if (existing) {
    const err = new Error('You have already reviewed this product');
    err.statusCode = 400;
    throw err;
  }

  // Check if user has ordered this product
  const ordered = await prisma.orderItem.findFirst({
    where: {
      product_id: productId,
      order: { user_id: userId, status: 'DELIVERED' }
    }
  });

  return await prisma.review.create({
    data: {
      user_id: userId,
      product_id: productId,
      rating,
      title,
      comment,
      images: images || [],
      is_verified_purchase: !!ordered
    },
    include: {
      user: { select: { name: true, avatar: true } }
    }
  });
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  addReview
};
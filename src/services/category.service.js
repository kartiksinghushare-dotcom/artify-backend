const prisma = require('../config/db');

// ── GET ALL CATEGORIES ────────────────────────────────────────────────
const getAllCategories = async () => {
  return await prisma.category.findMany({
    where: { 
      is_active: true,
      parent_id: null  // top level only
    },
    include: {
      children: {
        where: { is_active: true },
        orderBy: { display_order: 'asc' }
      }
    },
    orderBy: { display_order: 'asc' }
  });
};

// ── GET SINGLE CATEGORY ───────────────────────────────────────────────
const getCategoryBySlug = async (slug) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { is_active: true },
        orderBy: { display_order: 'asc' }
      }
    }
  });

  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  return category;
};

// ── CREATE CATEGORY (admin only) ──────────────────────────────────────
const createCategory = async ({ name, slug, parent_id, image, display_order }) => {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    const err = new Error('Category with this slug already exists');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.category.create({
    data: { name, slug, parent_id, image, display_order }
  });
};

// ── UPDATE CATEGORY (admin only) ──────────────────────────────────────
const updateCategory = async (id, data) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  return await prisma.category.update({ where: { id }, data });
};

// ── DELETE CATEGORY (admin only) ──────────────────────────────────────
const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Soft delete
  return await prisma.category.update({
    where: { id },
    data: { is_active: false }
  });
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
const { body } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),

  body('category_id')
    .notEmpty().withMessage('Category is required'),

  body('is_customisable')
    .optional()
    .isBoolean().withMessage('is_customisable must be true or false'),

  body('variants')
    .isArray({ min: 1 }).withMessage('At least one variant is required'),

  body('variants.*.price')
    .notEmpty().withMessage('Variant price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('variants.*.mrp')
    .notEmpty().withMessage('Variant MRP is required')
    .isFloat({ min: 0 }).withMessage('MRP must be a positive number'),

  body('variants.*.stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a positive number'),
];

module.exports = { createProductValidator };
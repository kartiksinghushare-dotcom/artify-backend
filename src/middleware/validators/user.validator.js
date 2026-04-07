const { body } = require('express-validator');

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('phone')
    .optional()
    .isMobilePhone('en-IN').withMessage('Please provide a valid Indian phone number'),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and a number'),
];

const addAddressValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),

  body('phone')
    .notEmpty().withMessage('Phone is required')
    .isMobilePhone('en-IN').withMessage('Please provide a valid Indian phone number'),

  body('line1')
    .trim()
    .notEmpty().withMessage('Address line 1 is required'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required'),

  body('pincode')
    .notEmpty().withMessage('Pincode is required')
    .matches(/^[1-9][0-9]{5}$/).withMessage('Please provide a valid 6 digit pincode'),
];

module.exports = { updateProfileValidator, changePasswordValidator, addAddressValidator };
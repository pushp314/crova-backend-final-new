/**
 * Validation Schemas Index
 */
const authValidations = require('./auth');
const productValidations = require('./product');
const orderValidations = require('./order');
const userValidations = require('./user');

module.exports = {
    ...authValidations,
    ...productValidations,
    ...orderValidations,
    ...userValidations,
};

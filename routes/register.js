const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const bcrypt = require('bcrypt');
const rUtil = require('./routingUtil');
const router = express.Router();

/* Register Page */
router.get('/', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'Register' };
  rUtil.gatherSessionVariables(response, req);
  res.render('register', response);
});

router.post('/',
  auth.checkNotAuthenticated,
  rUtil.captureUserInput,
  validator.check('fname').trim().notEmpty().withMessage("First name cannot be empty"),
  validator.check('lname').trim().notEmpty().withMessage("Last name cannot be empty"),
  validator.check('regcode').trim().notEmpty().withMessage("Registration code cannot be empty").matches('^[A-Za-z0-9_-]{10}$').withMessage('Invalid Registration Code'),
  validator.check('email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  validator.check('password', 'Password must be between 14 and 32 characters').isLength({ min: 14, max: 32 }).bail().isStrongPassword({ minLength: 14 }).withMessage('Password is not strong enough. Please check password requirements.'),
  validator.check('passconf').custom(function (value, { req }) {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  //validator.check('policycheck', 'You must agree to our Terms and Conditions and Privacy Policy before you may register.').exists(),
  rUtil.collectValidationErrors('/register'),
  rUtil.checkEmailNotUsed,
  auth.assignOrganization,
  async function (req, res, next) {
    try {
      req.session.errors = JSON.stringify([{ msg: 'This feature is not supported in demo mode!' }]);
      res.redirect('/register');
    } catch {
      res.redirect('/register');
    }
  });

module.exports = router;
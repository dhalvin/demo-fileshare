const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const rUtil = require('./routingUtil');
const router = express.Router();

/* Login Page */
router.get('/login', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'Login' };
  rUtil.gatherSessionVariables(response, req);
  res.render('login', response);
});

router.post('/login',
  auth.checkNotAuthenticated,
  rUtil.captureUserInput,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  rUtil.collectValidationErrors('/login'),
  auth.authenticate()
);

module.exports = router;
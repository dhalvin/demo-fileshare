const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const rUtil = require('./routingUtil');
const { session } = require('passport');
const router = express.Router();

/* Login Page */
router.get('/', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'Login' };
  rUtil.gatherSessionVariables(response, req);
  res.render('login', response);
});

router.post('/',
  auth.checkNotAuthenticated,
  rUtil.captureUserInput,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  rUtil.collectValidationErrors('/login'),
  function (req, res, next){
    req.session.errors = JSON.stringify([{ msg: 'This feature is not supported in demo mode!' }, {msg: 'Please \"login\" using the demo link below.'}]);
    res.redirect('/login');
  }
);

module.exports = router;
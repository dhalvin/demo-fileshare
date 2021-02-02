const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const router = express.Router();

/* Register Page */
router.get('/register', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'Register' };
  rUtil.gatherSessionVariables(response, req);
  res.render('register', response);
});

router.post('/register',
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
  validator.check('policycheck', 'You must agree to our Terms and Conditions and Privacy Policy before you may register.').exists(),
  rUtil.collectValidationErrors('/register'),
  rUtil.checkEmailNotUsed,
  auth.assignOrganization,
  async function (req, res, next) {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      var regdate = Date.now();
      var user = await auth.getUserFromEmail(req.body.email);
      var query = {
        command: 'INSERT INTO User (fname, lname, orgid, email, password, regdate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [req.body.fname, req.body.lname, res.locals.org, req.body.email, hashedPassword, regdate, 1]
      };
      if (res.locals.invite) {
        query.command = 'UPDATE User SET fname = ?, lname = ?, password = ?, regdate = ?, status = ? WHERE email = ?';
        query.args = [req.body.fname, req.body.lname, hashedPassword, regdate, 1, req.body.email];
      }
      mysql.query(query.command, query.args,
        function (error, result, fields) {
          if (!error) {
            rUtil.sendConfirmation((user ? user.id.toString() : result.insertId.toString()), req.body.email, req.body.fname, req.body.lname, regdate, 'Your account has been registered. An email has been sent to ' + req.body.email + '. Please follow the link in the email to confirm your email address. (Check your spam folder)', res, req);
          }
          else {
            logger.error(error);
            req.session.messages = ["Something went wrong, please try again."];
            res.redirect('/register');
          }
        });
    } catch {
      res.redirect('/register');
    }
  });

module.exports = router;
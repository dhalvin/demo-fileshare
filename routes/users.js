const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const router = express.Router();
const DEMO_WARNING_AJAX = {data: null, errors: [{ msg: 'This feature is not supported in demo mode!' }]};

router.get('/', auth.checkAuthenticatedAjax, auth.checkAdmin, async function (req, res, next) {
  const statusStr = ['Disabled', 'Active', 'Invite Sent'];
  var renderObject = { layout: false };
  renderObject.users = [];
  mysql.query('SELECT id, email, fname, lname, regdate, status FROM User WHERE orgid = ?', [req.user.orgid], function (error, results, fields) {
    if (!error) {
      for (result of results) {
        renderObject.users.push({ id: result.id, email: result.email, name: result.fname + ' ' + result.lname, regdate: (result.regdate ? new Date(result.regdate).toDateString() : 'Registration Pending'), statusText: statusStr[result.status], status: result.status });
      }
      res.render('index/table_users', renderObject);
    }
    else {
      logger.error(error);
      res.json({ data: null, error: "Something went wrong." });
    }
  });
});

router.get('/status/:id/:status', auth.checkAuthenticatedAjax, auth.checkAdmin,
  validator.check('id').isInt().toInt(),
  validator.check('status').isInt({ min: 0, max: 1 }).toInt(),
  rUtil.collectValidationErrors('/'),
  function (req, res, next) {
    if(req.params.id == req.user.id){
      return res.json({ data: null, errors: [{msg: 'You cannot change your own status.'}] });
    }
    res.json(DEMO_WARNING_AJAX);
  });

router.post('/create', auth.checkAuthenticatedAjax, auth.checkAdmin,
  validator.check('user_invite', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  rUtil.collectValidationErrors(null),
  rUtil.checkEmailNotUsedAjax('body', 'user_invite'),
  async function (req, res, next) {
    var orgProfile = await auth.getOrgFromId(req.user.orgid);
    if (orgProfile.regexpire < Date.now() + (1000 * 60 * 60 * 3)) {
      return res.json({ data: null, errors: [{ msg: "Registration code expired or expires soon. Please generate a new code first." }] });
    }
    res.json(DEMO_WARNING_AJAX);
  });

router.get('/resend/:userid', auth.checkAuthenticatedAjax, auth.checkAdmin,
  validator.check('userid').isInt().toInt(),
  rUtil.collectValidationErrors(null),
  async function (req, res, next) {
    var user = await auth.getUserFromId(req.params.userid);
    if(!user){
      return res.json({ data: null, errors: [{ msg: "Invalid Request" }] });
    }
    var orgProfile = await auth.getOrgFromId(user.orgid);
    if (user.status != 2){
      return res.json({ data: null, errors: [{ msg: "User already registered." }] });
    }
    if (orgProfile.regexpire < Date.now() + (1000 * 60 * 60 * 3)) {
      return res.json({ data: null, errors: [{ msg: "Registration code expired or expires soon. Please generate a new code first." }] });
    }
    res.json(DEMO_WARNING_AJAX);
  });
module.exports = router;
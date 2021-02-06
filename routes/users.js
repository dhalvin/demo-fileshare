const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const router = express.Router();

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
    mysql.query('UPDATE User SET status = ? WHERE id = ? and orgid = ?', [req.params.status, req.params.id, req.user.orgid], function (error, results, fields) {
      if (error) throw error;
      res.json({ data: true, error: null });
    });
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
    mysql.query('INSERT INTO User (email, fname, lname, orgid, status) VALUES (?, ?, ?, ?, ?)', [req.body.user_invite, ' ', ' ', req.user.orgid, 2], function (error, result, fields) {
      if (error) throw error;
      var userid = result.insertId.toString();
      rUtil.sendInvite('email_invitation', {
        id: userid,
        email: req.body.user_invite,
        regcode: orgProfile.regcode,
        regexpire: orgProfile.regexpire,
        org: orgProfile.name
      }, res, function () {
        res.json({ data: { success: "An email has been sent to " + req.body.user_invite + " with instructions to register their account. The registration link included in the email will expire a the same time as your current registration code. Return to this screen and use the \"Resend\" button if the invitation expires before they can register." }, error: null });
      });
    });
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
    rUtil.sendInvite('email_invitation', {
      id: user.id,
      email: user.email,
      regcode: orgProfile.regcode,
      regexpire: orgProfile.regexpire,
      org: orgProfile.name
    }, res, function () {
      res.json({ data: { success: "An email has been sent to " + user.email + " with instructions to register their account. The registration link included in the email will expire a the same time as your current registration code. Return to this screen and use the \"Resend\" button if the invitation expires before they can register." }, error: null });
    });
  });
module.exports = router;
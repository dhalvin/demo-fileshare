const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const router = express.Router();

router.get('/orgs', auth.checkAuthenticatedAjax, auth.checkSuperAdmin, function (req, res, next) {
  const statusStr = ['Disabled', 'Active', 'Invite Sent'];
  var renderObject = { layout: false };
  renderObject.orgs = [];
  mysql.query('SELECT id, name, dirkey, status FROM Organization', function (error, results, fields) {
    if (!error) {
      for (result of results) {
        renderObject.orgs.push({ id: result.id, name: result.name, dirkey: result.dirkey, statusText: statusStr[result.status], status: result.status });
      }
      res.render('index/table_orgs', renderObject);
    }
    else {
      logger.error(error);
      res.json({ data: null, error: "Something went wrong." });
    }
  });
});

router.get('/orgs/status/:orgid/:status', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('orgid').isInt().toInt(),
  validator.check('status').isInt({ min: 0, max: 1 }).toInt(),
  rUtil.collectValidationErrors(null),
  function (req, res, next) {
    mysql.query('UPDATE Organization SET status = ? WHERE id = ?', [req.params.status, req.params.orgid], function (error, results, fields) {
      if (error) throw error;
      res.json({ data: true, error: null });
    });
  });

router.post('/orgs/create', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('org_name').trim().notEmpty().withMessage("Organization name cannot be empty"),
  validator.check('org_email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  rUtil.collectValidationErrors(null),
  rUtil.checkEmailNotUsedAjax('body', 'org_email'),
  rUtil.checkOrgNotUsedAjax('body', 'org_name'),
  function (req, res, next) {
    var regcode = nanoid(10);
    var regexpire = Date.now() + (1000 * 60 * 60 * 24);
    mysql.query('INSERT INTO Organization (name, dirkey, regcode, regexpire, status) VALUES (?, ?, ?, ?, ?)', [req.body.org_name, req.body.org_name, regcode, regexpire, 2], function (error, result, fields) {
      if (error) throw error;
      var orgid = result.insertId.toString();
      mysql.query('INSERT INTO User (email, fname, lname, orgid, status, isadmin) VALUES (?, ?, ?, ?, ?, ?)', [req.body.org_email, ' ', ' ', orgid, 2, true], function (error, result, fields) {
        if (error) throw error;
        var userid = result.insertId.toString();
        rUtil.sendInvite('email_invitation_org', {
          id: userid,
          email: req.body.org_email,
          regcode: regcode,
          regexpire: regexpire,
          org: req.body.org_name,
          sender: req.user.email
        }, res, function () {
          res.json({ data: { success: "An email has been sent to " + req.body.org_email + " with instructions to register their account. The registration link included in the email will expire in 24 hours. Return to this screen and use the \"Resend\" button if the invitation expires before they can register." }, error: null });
        });
      });
    });
  });

router.get('/orgs/resend/:orgid', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('orgid').isInt().toInt(),
  rUtil.collectValidationErrors(null),
  function (req, res, next) {
    var regcode = nanoid(10);
    var regexpire = Date.now() + (1000 * 60 * 60 * 24);
    mysql.query('UPDATE Organization SET regcode = ?, regexpire = ? WHERE id = ? and status = 2', [regcode, regexpire, req.params.orgid], function (error, result, fields) {
      if (error) throw error;
      if (result.changedRows < 1) {
        return res.json({ date: null, errors: [{ msg: 'Organization already registered.' }] });
      }
      mysql.query('SELECT User.id as id, email, regcode, regexpire, Organization.name as orgname FROM User LEFT JOIN Organization ON User.orgid=Organization.id WHERE User.orgid = ?', [req.params.orgid], function (error, results, fields) {
        if (error) throw error;
        rUtil.sendInvite('email_invitation_org', {
          id: results[0].id,
          email: results[0].email,
          regcode: results[0].regcode,
          regexpire: results[0].regexpire,
          org: results[0].orgname,
          sender: req.user.email
        }, res, function () {
          res.json({ data: { success: "An email has been sent to " + req.body.org_email + " with instructions to register their account. The registration link included in the email will expire in 24 hours. Return to this screen and use the \"Resend\" button if the invitation expires before they can register." }, error: null });
        });
      });
    });
  });
module.exports = router;
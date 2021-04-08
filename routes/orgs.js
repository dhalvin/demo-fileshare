const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const { nanoid } = require('nanoid');
const router = express.Router();
const DEMO_WARNING_AJAX = {data: null, errors: [{ msg: 'This feature is not supported in demo mode!' }]};

router.get('/', auth.checkAuthenticatedAjax, auth.checkSuperAdmin, function (req, res, next) {
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

router.get('/status/:orgid/:status', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('orgid').isInt().toInt(),
  validator.check('status').isInt({ min: 0, max: 1 }).toInt(),
  rUtil.collectValidationErrors(null),
  function (req, res, next) {
    if(req.params.orgid == req.user.orgid){
      return res.json({ data: null, errors: [{msg: 'You cannot change your own organization\'s status.'}] });
    }
    res.json(DEMO_WARNING_AJAX);
  });

router.post('/create', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('org_name').trim().notEmpty().withMessage("Organization name cannot be empty"),
  validator.check('org_email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  rUtil.collectValidationErrors(null),
  rUtil.checkEmailNotUsedAjax('body', 'org_email'),
  rUtil.checkOrgNotUsedAjax('body', 'org_name'),
  function (req, res, next) {
    res.json(DEMO_WARNING_AJAX);
  });

router.get('/resend/:orgid', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
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
      res.json(DEMO_WARNING_AJAX);
    });
  });
module.exports = router;
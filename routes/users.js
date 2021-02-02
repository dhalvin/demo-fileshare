const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const mysql = require('../db-config');
const rUtil = require('./routingUtil');
const router = express.Router();

router.get('/users', auth.checkAuthenticatedAjax, auth.checkAdmin, async function(req, res, next){
  const statusStr = ['Disabled', 'Active', 'Invite Sent'];
  var renderObject = {layout: false};
  renderObject.users = [];
  mysql.query('SELECT id, email, fname, lname, regdate, status FROM User WHERE orgid = ?', [req.user.orgid], function(error, results, fields){
    if(!error){
      for(result of results){
        renderObject.users.push({id: result.id, email: result.email, name: result.fname + ' ' + result.lname, regdate: new Date(result.regdate).toDateString(), statusText: statusStr[result.status], status: result.status});
      }
      res.render('index/table_users', renderObject);
    }
    else{
      logger.error(error);
      res.json({data: null, error: "Something went wrong."});
    }
  });
});

router.get('/users/status/:id/:status', auth.checkAuthenticatedAjax, auth.checkAdmin,
  validator.check('id').isInt().toInt(),
  validator.check('status').isInt({min: 0, max: 1}).toInt(),
  rUtil.collectValidationErrors('/'),
  function(req, res, next){
    mysql.query('UPDATE User SET status = ? WHERE id = ? and orgid = ?', [req.params.status, req.params.id, req.user.orgid], function(error, results, fields){
      if(error) throw error;
      res.json({data: true, error: null});
    });
});

module.exports = router;
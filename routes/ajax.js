const express = require('express');
const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const validator = require('express-validator');
const aws = require('../s3-config');
const router = express.Router();

router.get('/', auth.checkAuthenticatedAjax, async function(req, res, next){
  var renderObject = {layout: false};
  renderObject.org = '/';
  renderObject.back = false;
  var awsResponse = await aws.listOrganizations(req.user.org);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', '', renderObject.dirs);
  processNames('Key', '', renderObject.files);
  res.render('files_view', renderObject);});

router.get('/:org', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function(req, res, next){
  var renderObject = {layout: false};
  renderObject.org = req.user.org;
  renderObject.back = '/';
  var awsResponse = await aws.listYears(req.user.org);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org +'/', renderObject.dirs);
  processNames('Key', req.user.org +'/', renderObject.files);
  res.render('files_view', renderObject);});

router.get('/:org/:year', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function(req, res, next){
  var renderObject = {layout: false};
  renderObject.org = req.user.org;
  renderObject.year = req.params.year;
  renderObject.back = req.user.org;
  var awsResponse = await aws.listPlans(req.user.org, req.params.year);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org +'/'+req.params.year+'/', renderObject.dirs);
  processNames('Key', req.user.org +'/'+req.params.year+'/', renderObject.files);
  res.render('files_view', renderObject);
});

router.get('/:org/:year/:plan', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function(req, res, next){
  var renderObject = {layout: false};
  renderObject.org = req.user.org;
  renderObject.year = req.params.year;
  renderObject.plan = req.params.plan;
  renderObject.back = req.user.org + '/' + req.params.year;
  var awsResponse = await aws.listPlanFiles(req.user.org, req.params.year, req.params.plan);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org +'/'+req.params.year+'/'+req.params.plan+'/', renderObject.dirs);
  processNames('Key', req.user.org +'/'+req.params.year+'/'+req.params.plan+'/', renderObject.files);
  res.render('files_view', renderObject);
});

function processNames(prefixKey, prefix, array){
  for(elem of array){
    elem.displayName = elem[prefixKey].replace(prefix, '');
  }
}

module.exports = router;

const express = require('express');
const logger = require('../logger');
const auth = require('../authentication');
const validator = require('express-validator');
const aws = require('../s3-config');
const multer = require('../multer-config');
const router = express.Router();

router.get('/modal', auth.checkAuthenticatedAjax, function(req, res, next){
  res.render('upload_modal', { layout: false });
});

router.get('/', auth.checkAuthenticatedAjax, async function (req, res, next) {
  var renderObject = { layout: false };
  renderObject.org = '/';
  renderObject.back = false;
  renderObject.currentPath = "";
  var awsResponse = await aws.listOrganizations(req.user.org);
  renderObject.dirs = awsResponse.CommonPrefixes;
  processNames('Prefix', '', renderObject.dirs);
  res.render('index/table_dirs', renderObject);
});

router.get('/:org', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function (req, res, next) {
  var renderObject = { layout: false };
  renderObject.org = req.user.org;
  renderObject.back = '/';
  renderObject.currentPath = req.user.org + '/';
  var awsResponse = await aws.listYears(req.user.org);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org + '/', renderObject.dirs);
  processNames('Key', req.user.org + '/', renderObject.files);
  res.render('index/table_dirs', renderObject);
});

router.get('/:org/:year', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function (req, res, next) {
  var renderObject = { layout: false };
  renderObject.org = req.user.org;
  renderObject.year = req.params.year;
  renderObject.back = req.user.org;
  renderObject.currentPath = req.user.org + '/' + req.params.year + '/';
  var awsResponse = await aws.listPlans(req.user.org, req.params.year);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org + '/' + req.params.year + '/', renderObject.dirs);
  processNames('Key', req.user.org + '/' + req.params.year + '/', renderObject.files);
  res.render('index/table_dirs', renderObject);
});

router.get('/:org/:year/:plan', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function (req, res, next) {
  var renderObject = { layout: false };
  renderObject.org = req.user.org;
  renderObject.year = req.params.year;
  renderObject.plan = req.params.plan;
  renderObject.back = req.user.org + '/' + req.params.year;
  renderObject.currentPath = req.user.org + '/' + req.params.year + '/' + req.params.plan + '/';
  var awsResponse = await aws.listPlanFiles(req.user.org, req.params.year, req.params.plan);
  renderObject.dirs = awsResponse.CommonPrefixes;
  renderObject.files = awsResponse.Contents;
  processNames('Prefix', req.user.org + '/' + req.params.year + '/' + req.params.plan + '/', renderObject.dirs);
  processNames('Key', req.user.org + '/' + req.params.year + '/' + req.params.plan + '/', renderObject.files);
  res.render('index/table_files', renderObject);
});

router.get('/dl/:org/:year/:plan/:file', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, async function (req, res, next) {
  var pathKey = req.user.org + '/' + req.params.year + '/' + req.params.plan + '/' + req.params.file;
  var s3Stream = aws.getFileStream(pathKey);
  res.set('Cache-Control', 'no-cache');
  res.set('Content-Disposition', 'attachment; filename=' + req.params.file);
  res.set('Content-Type', 'application/octet-stream');
  s3Stream.pipe(res);
});

router.post('/upload/:org/:year/:plan', auth.checkAuthenticatedAjax, auth.checkOrgAuthorized, multer.upload.array('files'),
  function (req, res, next){
    var response = {data: {files: []}, errors: []};
    if(req.badFiles){
      for(file of req.badFiles){
        response.errors.push({msg: file.name + ': ' + file.reason});
        response.data.files.push({name: file.name, status: 'fail'});
      }
    }

    for(file of req.files){
      response.data.files.push({name: file.originalname, status: 'ok'});
    }

    return res.json(response);
  });

function processNames(prefixKey, prefix, array) {
  for (elem of array) {
    elem.displayName = elem[prefixKey].replace(prefix, '');
  }
}

module.exports = router;

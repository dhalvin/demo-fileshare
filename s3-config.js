const logger = require('./logger');
const aws = require('aws-sdk');
aws.config.update({ region: 'us-west-1' });
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const bucketName = process.env.S3_BUCKET_NAME;

function listBuckets() {
  return new Promise(function(resolve, reject){
    s3.listBuckets(function (err, data) {
      if (err) { 
        logger.error(err)
        reject(err); 
      }
      else {
        logger.info(data.Buckets);
        resolve(data.Buckets);
      }
    });
  });
}

function listObjects() {
  return new Promise(function(resolve, reject){
    s3.listObjects(bucketParams, function (err, data) {
      if (err) { 
        logger.error(err)
        reject(err); 
      }
      else {
        logger.info(data);
        resolve(data);
      }
    });
  });
}

function listDirContents(prefix){
  return new Promise(function(resolve, reject){
    try{
      var bucketParams = {
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/'
      };
      s3.listObjectsV2(bucketParams, function(err, data){
        //logger.info(data);
        resolve(data);
      });
    }
    catch(error){
      logger.error(error);
      reject(error);
    }
  });
}
function listOrganizations(orgName){
  return listDirContents(orgName);
}
function listYears(orgName){
  return listDirContents(orgName + '/');
}
function listPlans(orgName, year){
  return listDirContents(orgName + '/' + year + '/');
}
function listPlanFiles(orgName, year, plan){
  return listDirContents(orgName + '/' + year + '/' + plan + '/');
}

function getFileStream(fileKey){
  try{
    var bucketParams = {
      Bucket: bucketName,
      Key: fileKey
    };
    return s3
      .getObject(bucketParams)
      .createReadStream()
      .on('error', err => {
        logger.error('stream error', err);
      });/*
      .on('finish', () => {
        logger.info('stream finish');
      })
      .on('close', () => {
        logger.info('stream close');
      });*/
  }
  catch(error){
    logger.error(error);
  }
}

function uploadFile(key, stream){
  try{
    var bucketParams = {
      Bucket: bucketName,
      Key: key,
      Body: stream
    };
    return s3.upload(bucketParams);
  }
  catch(error){
    logger.error(error);
  }
}

module.exports.listBuckets = listBuckets;
module.exports.listObjects = listObjects;
module.exports.listDirContents = listDirContents;
module.exports.listOrganizations = listOrganizations;
module.exports.listYears = listYears;
module.exports.listPlans = listPlans;
module.exports.listPlanFiles = listPlanFiles;
module.exports.getFileStream = getFileStream;
module.exports.uploadFile = uploadFile;
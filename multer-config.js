const logger = require('./logger');
const multer = require('multer');
const aws = require('./s3-config');
const path = require('path');
//50 MB
const sizeLimit = 52428800;
const filesLimit = 20;
const acceptedFileTypes = {
  '.doc': {ext: 'doc', mime: 'application/msword', name: 'Microsoft Word'},
  '.docx': {ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Microsoft Word (OpenXML)'},
  '.pdf': {ext: 'pdf', mime: 'application/pdf', name: 'Adobe Portable Document Format (PDF)'},
  '.xls': {ext: 'xls', mime: 'application/vnd.ms-excel', name: 'Microsoft Excel'},
  '.xlsx': {ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: 'Microsoft Excel (OpenXML)'},
  '.zip': {ext: 'zip', mime: 'application/zip', name: 'ZIP archive'}
};

function fileFilter (req, file, cb) {
  if(req.badFiles === undefined){
    req.badFiles = [];
  }

  var fileExt = path.extname(file.originalname);

  if(!(fileExt in acceptedFileTypes)){
    req.badFiles.push({name: file.originalname, reason: 'Invalid File Type. The only accepted file types are: .doc, .docx, .pdf, .xls, .xlsx, .zip'});
    return cb(null, false);
  }

  cb(null, true)
}

function MyCustomStorage () {}

MyCustomStorage.prototype._handleFile = function _handleFile (req, file, cb) {
  var basePath = req.user.org + '/';
  if(req.params.year){
    basePath += (req.params.year + '/');
    if(req.params.plan){
      basePath += (req.params.plan + '/');
    }
  }

  const manager = aws.uploadFile(basePath + file.originalname, file.stream);
  manager.promise().then(function(data){
    //success
    cb(null, {})
  }, function(error){
    //fail
    cb(error);
  });
}

MyCustomStorage.prototype._removeFile = function _removeFile (req, file, cb) {}

module.exports.storage = new MyCustomStorage();
module.exports.upload = multer({
  storage: module.exports.storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: sizeLimit,
    files: filesLimit
  },
});
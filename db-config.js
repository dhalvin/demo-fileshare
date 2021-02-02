const mysql = require('mysql');
const logger = require('./logger');

const dbConfig = {
    host: process.env.MYSQL_URI,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: 'hasfs',
    multipleStatements: true
  };

if(process.env.NODE_ENV !== 'production'){
  dbConfig.insecureAuth = true;
}

var dbCon;
function createDBConnect(){
  dbCon = mysql.createConnection(dbConfig);
  module.exports = dbCon;
  dbCon.on('error', function(error){
    logger.error(error);
    if(error.code === 'PROTOCOL_CONNECTION_LOST'){
      handleDBDisconnect();
    }
    else {
      throw error;
    }
  });
}
function handleDBDisconnect() {
  createDBConnect();
  dbCon.connect(function(error){
    if(error){
      logger.error('error reconnecting to DB')
      logger.error(error);
      setTimeout(handleDBDisconnect, 2000);
    }
  });
}
createDBConnect();
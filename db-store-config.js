var mysqlPool = require('./db-config');

const dbConfig = {
    host: process.env.MYSQL_URI,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: 'demo_fileshare'
  };

module.exports.init = function(sessionModule){
  module.exports.MySQLStore = require('express-mysql-session')(sessionModule);
  module.exports.store = new module.exports.MySQLStore(dbConfig, mysqlPool); 
}
const mysql = require('mysql');
const logger = require('./logger');

const dbConfig = {
    connectionLimit: 10,
    host: process.env.MYSQL_URI,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: 'demo_fileshare',
    multipleStatements: true
  };

if(process.env.NODE_ENV !== 'production'){
  dbConfig.insecureAuth = true;
}

var pool;
connectToDB();

function connectToDB(){
  pool = mysql.createPool(dbConfig);

  /*pool.on('acquire', function (connection) {
    console.log('Connection %d acquired', connection.threadId);
  });

  pool.on('connection', function (connection) {
    console.log('connection made');
  });

  pool.on('enqueue', function () {
    console.log('Waiting for available connection slot');
  });

  pool.on('release', function (connection) {
    console.log('Connection %d released', connection.threadId);
  });*/

  module.exports = pool;

  //Ensure we are really connected.
  pool.getConnection(function(err, connection){
    if(err){
      logger.error('DB Connection Refused... Trying again.', err);
      setTimeout(connectToDB, 2000);
    }
  });
}
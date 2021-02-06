const mysql = require('./db-config');
const passport = require('passport');
const logger = require('./logger');
const bcrypt = require('bcrypt');
const initializePassport = require('./passport-config');
initializePassport(passport, getUserFromEmail, getUserFromId, logLoginAttempt);

function authenticate() {
  return passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true
  });
}

async function authenticateAjax(req, res, next) {
  if( await bcrypt.compare(req.body.password, req.user.password) ){
    next();
  }
  else{
    return res.json({data: null, errors: [{msg: 'Incorrect password.'}]});
  }
}

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  }
  else {
    res.redirect('/login');
  }
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect('/');
  }
  else {
    next();
  }
}

function checkAuthenticatedAjax(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  }
  else {
    res.json({err: 'Invalid Authentication', data: null});
  }
}

function checkNotAuthenticatedAjax(req, res, next) {
  if (req.isAuthenticated()) {
    res.json({err: 'Invalid Authentication', data: null});
  }
  else {
    next();
  }
}

function checkOrgAuthorized(req, res, next) {
  if (req.user.org === req.params.org) {
    next();
  }
  else {
    res.json({error: 'Invalid Authentication', data: null});
  }
}

function checkAdmin(req, res, next) {
  if (req.user.admin) {
    next();
  }
  else {
    res.json({error: 'Invalid Authentication', data: null});
  }
}

function checkSuperAdmin(req, res, next) {
  if (req.user.superadmin) {
    next();
  }
  else {
    res.json({error: 'Invalid Authentication', data: null});
  }
}

async function getUserFromEmail(email) {
  return await getUserProfile('User.email', email);
}

async function getUserFromId(id) {
  return await getUserProfile('User.id', id);
}

async function getUserProfile(key, value){
  return new Promise(function (resolve, reject) {
    mysql.query('SELECT User.id as id, fname, lname, email, emailverified, password, orgid, Organization.name as orgname, User.status, isadmin, issuperadmin, loginattempts, attempttime, regdate FROM User LEFT JOIN Login ON User.lastlogin=Login.id LEFT JOIN Organization on User.orgid=Organization.id WHERE ?? = ?', [key, value],
      function (error, results, fields) {
        if (!error) {
          if (results.length > 0) {
            resolve({
              id: results[0].id,
              fname: results[0].fname,
              lname: results[0].lname,
              email: results[0].email,
              verified: results[0].emailverified,
              password: (results[0].password ? results[0].password.toString() : null),
              orgid: results[0].orgid,
              org: results[0].orgname,
              status: results[0].status,
              admin: results[0].isadmin,
              superadmin: results[0].issuperadmin,
              loginattempts: results[0].loginattempts,
              attempttime: results[0].attempttime,
              regdate: results[0].regdate
            });
          }
          else {
            resolve(null);
          }
        }
        else {
          logger.error(error);
          //req.session.messages = ["Something went wrong, please try again."];
          resolve(null);
        }
      });
  });
}
async function getOrgFromId(id) {
  return await getOrgProfile('id', id);
}

async function getOrgProfile(key, value){
  return new Promise(function (resolve, reject) {
    mysql.query('SELECT id, name, dirkey, regcode, regexpire, status FROM Organization WHERE ?? = ?', [key, value],
      function (error, results, fields) {
        if (!error) {
          if (results.length > 0) {
            resolve({
              id: results[0].id,
              name: results[0].name,
              dirkey: results[0].dirkey,
              regcode: results[0].regcode,
              regexpire: results[0].regexpire,
              status: results[0].status,
            });
          }
          else {
            resolve(null);
          }
        }
        else {
          logger.error(error);
          resolve(null);
        }
      });
  });
}


function logLoginAttempt(userid, status, firstFail = false) {
  mysql.query('INSERT INTO Login (userid, attempttime, status) VALUES (?, ?, ?)', [userid, Date.now(), status],
    function (error, results, fields) {
      if (error) throw error;
      mysql.query('UPDATE User SET lastlogin = ?, loginattempts = ' + (status ? '0' : (firstFail ? '1' : '`loginattempts` + 1')) + ' WHERE id = ?', [results.insertId, userid],
        function (error, results, fields) {
          if (error) throw error;
        });
    });

}

//Assigns a new user to org based on entered regcode, output to res.locals.org
function assignOrganization(req, res, next){
  mysql.query('SELECT id, regcode, regexpire FROM Organization WHERE regcode = ?', [req.body.regcode],
    function(error, result, fields){
      if(error || result.length > 1){
        logger.error(error | 'ERROR: Possible regcode collision...');
        req.session.messages = ["Something went wrong, please try again."];
        return res.redirect('/register');
      }
      if(result.length < 1){
        req.session.messages = ["Invalid registration code. Try again, or verify the code with your Organization Administrator."];
        return res.redirect('/register');
      }
      else if(result[0].regexpire <= Date.now()){
        req.session.messages = ["Registration code expired. Please contact your Organization Administrator for a new code."];
        return res.redirect('/register');
      }
      else{
        res.locals.org = result[0].id;
        next();
      }
    });
}

module.exports = {
  passport: passport,
  authenticate: authenticate,
  authenticateAjax: authenticateAjax,
  checkAuthenticated: checkAuthenticated,
  checkNotAuthenticated: checkNotAuthenticated,
  checkAuthenticatedAjax: checkAuthenticatedAjax,
  checkNotAuthenticatedAjax: checkNotAuthenticatedAjax,
  getUserFromEmail: getUserFromEmail,
  getUserFromId: getUserFromId,
  logLoginAttempt: logLoginAttempt,
  checkOrgAuthorized: checkOrgAuthorized,
  getUserProfile: getUserProfile,
  assignOrganization: assignOrganization,
  checkAdmin: checkAdmin,
  checkSuperAdmin: checkSuperAdmin,
  getOrgFromId: getOrgFromId
}
const mysql = require('./db-config');
const passport = require('passport');
const initializePassport = require('./passport-config');
initializePassport(passport, getUserFromEmail, getUserFromId, logLoginAttempt);

function authenticate() {
  return passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true
  });
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
    res.json(JSON.stringify({err: 'Invalid Authentication', data: null}));
  }
}

function checkNotAuthenticatedAjax(req, res, next) {
  if (req.isAuthenticated()) {
    res.json(JSON.stringify({err: 'Invalid Authentication', data: null}));
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
    res.json(JSON.stringify({err: 'Invalid Authentication', data: null}));
  }
}

async function getUserFromEmail(email) {
  return new Promise(function (resolve, reject) {
    mysql.query('SELECT User.id, fname, lname, email, emailverified, password, orgid, Organization.name as orgname, loginattempts, attempttime, regdate FROM User LEFT JOIN Login ON User.lastlogin=Login.id LEFT JOIN Organization on User.orgid=Organization.id WHERE email = ?', [email],
      function (error, results, fields) {
        if (!error) {
          if (results.length > 0) {
            resolve({
              id: results[0].id,
              fname: results[0].fname,
              lname: results[0].lname,
              email: results[0].email,
              verified: results[0].emailverified,
              password: results[0].password.toString(),
              orgid: results[0].orgid,
              org: results[0].orgname,
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
          req.session.messages = ["Something went wrong, please try again."];
          resolve(null);
        }
      });
  });
}

async function getUserFromId(id) {
  return new Promise(function (resolve, reject) {
    mysql.query('SELECT User.id, fname, lname, email, emailverified, password, orgid, Organization.name as orgname, loginattempts, attempttime,regdate FROM User LEFT JOIN Login ON User.lastlogin=Login.id LEFT JOIN Organization on User.orgid=Organization.id WHERE User.id = ?', [id],
      function (error, results, fields) {
        if (!error) {
          if (results.length > 0) {
            resolve({
              id: results[0].id,
              fname: results[0].fname,
              lname: results[0].lname,
              email: results[0].email,
              verified: results[0].emailverified,
              password: results[0].password.toString(),
              orgid: results[0].orgid,
              org: results[0].orgname,
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
          req.session.messages = ["Something went wrong, please try again."];
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


module.exports = {
  passport: passport,
  authenticate: authenticate,
  checkAuthenticated: checkAuthenticated,
  checkNotAuthenticated: checkNotAuthenticated,
  checkAuthenticatedAjax: checkAuthenticatedAjax,
  checkNotAuthenticatedAjax: checkNotAuthenticatedAjax,
  getUserFromEmail: getUserFromEmail,
  getUserFromId: getUserFromId,
  logLoginAttempt: logLoginAttempt,
  checkOrgAuthorized: checkOrgAuthorized
}
const express = require('express');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const validator = require('express-validator');
//const nodemail = require('../email-config');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { nanoid } = require('nanoid');
const rUtil = require('./routingUtil');

const DEMO_WARNING = JSON.stringify([{ msg: 'This feature is not supported in demo mode!' }]);
const DEMO_WARNING_AJAX = {data: {errors: [{ msg: 'This feature is not supported in demo mode!' }]}};
const orgdesc = {
  "Demo Client Organization": "The Client Organization is the owner of the file share portal. The purpose of the file share system is to exchange data with this main organization. Only the Client Organization can have Super Admin users.",
  "Demo Organization_1": "This organization is managed by someone who wants to share files with the Client Organization."
}

const userdesc = {
  "Super Admin": "This role can create and manage organizations",
  "Admin": "This role can create and manage users within their organization",
  "User": "This role cannot manage users or organizations. They have normal access to files within their organization.",
}
userdesc.Admin_1 = userdesc["Admin"];
userdesc.User_1 = userdesc["User"];
const democolors = ['#007bff', '#6610f2', '#dc3545'];
/* Home page. */
router.get('/', auth.checkAuthenticated, async function (req, res, next) {
  var response = { title: 'Home', user: req.user, scripts: ['index', 'files', 'account'], styles: ['index'] };
  //Render files table
  var table_files = await rUtil.renderPartial('index/table_files_loading', {}, res, req);
  //Render files tab pane
  response.tab_files = await rUtil.renderPartial('index/tab_files', { table_files: table_files }, res, req);

  //Render account tab pane
  response.tab_account = await rUtil.renderPartial('index/tab_account', { user: req.user }, res, req);

  if (req.user.admin) {
    //Render users table
    var table_users = await rUtil.renderPartial('index/table_users_loading', {}, res, req);
    //Render users tab
    var orgInfo = await auth.getOrgFromId(req.user.orgid);
    response.tab_users = await rUtil.renderPartial('index/tab_users', { user: req.user, regcode: orgInfo.regcode, regexpire: orgInfo.regexpire, table_users: table_users }, res, req);
    response.scripts.push('users');
  }

  if (req.user.superadmin) {
    //Render orgs table
    var table_orgs = await rUtil.renderPartial('index/table_orgs_loading', {}, res, req);
    //Render orgs tab
    response.tab_orgs = await rUtil.renderPartial('index/tab_orgs', { table_orgs: table_orgs }, res, req);
    response.scripts.push('orgs');
  }
  res.render('index', response);
});

/* User Select Page */
router.get('/demoselect', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'User Select', styles: ['demo_select'], scripts: ['animations'] };
  response.demousers = {};
  response.organizations = [];
  rUtil.gatherSessionVariables(response, req);
  mysql.query('SELECT User.id as id, fname, lname, orgid, User.status, Organization.name as orgname FROM User LEFT JOIN Organization on User.orgid=Organization.id WHERE User.status <> 2', [],
  function (error, results, fields) {
    if(error) throw error;
    var color = 0;
    for( user of results ){
      if(!response.demousers[user.orgname]){
        response.demousers[user.orgname] = [];
        response.organizations.push(user.orgname);
      }
      response.demousers[user.orgname].push({
        role: user.lname,
        organization: user.orgname,
        description: userdesc[user.lname],
        orgdesc: orgdesc[user.orgname],
        icon: '<svg class="usericon" height="100" width="100"><circle cx="50" cy="50" r="50" fill="'+democolors[color]+'"/><text x="50" y="75" text-anchor="middle" stroke="white" fill="white" font-size="4em">'+user.lname[0]+'</text></svg>'
      });
      color = (color + 1) % democolors.length;
    }
    res.render('demo_select', response);
  });
});

/* Change Password */
router.post('/changepassword', auth.checkAuthenticatedAjax,
  async function (req, res, next) {
    res.json(DEMO_WARNING_AJAX);
  });

router.get('/resend',
  auth.checkNotAuthenticated,
  async function (req, res, next) {
    req.session.errors = DEMO_WARNING;
    res.redirect('/login');
  });

router.get('/invite/:token', auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  rUtil.verifyToken('/login', [{ source: 'user', value: 'email' }, { source: 'org', value: 'regcode' }, { source: 'user', value: 'status' }]),
  function (req, res, next) {
    var user = res.locals.user;
    var org = res.locals.org;
    req.session.fields = {};
    req.session.fields.invite = true;
    req.session.fields.org = org.name;
    req.session.fields.regcode = org.regcode;
    req.session.fields.email = user.email;
    res.redirect('/register');
  });

/* Forgot Password Page */
router.get('/forgot', auth.checkNotAuthenticated, function (req, res, next) {
  const response = { title: 'Forgot Password' };
  rUtil.gatherSessionVariables(response, req);
  res.render('forgot', response);
});

router.post('/forgot',
  auth.checkNotAuthenticated,
  async function (req, res, next) {
    req.session.errors = DEMO_WARNING;
    res.redirect('/forgot');
  });

/* Confirm Email */
router.get('/confirm/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  rUtil.verifyToken('/login', [{ source: 'user', value: 'email' }, { source: 'user', value: 'regdate' }, { source: 'user', value: 'verified' }]),
  async function (req, res, next) {
    var user = res.locals.user;
    mysql.query('UPDATE User SET emailverified = ? WHERE id = ?', [1, user.id]);
    req.session.successalert = { strong: "Success!", msg: "You've successfully confirmed your email address. Login to proceed!" };
    if (req.session.fields) {
      req.session.fields.email = user.email;
    }
    else {
      req.session.fields = { email: user.email };
    }
    res.redirect('/login');
  }
);

/* Reset Password */
router.get('/reset/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  rUtil.verifyToken('/login', [{ source: 'user', value: 'password' }, { source: 'user', value: 'regdate' }]),
  function (req, res, next) {
    var token = req.params.token;
    const response = { title: 'Reset Password', token: token, user: res.locals.user };
    rUtil.gatherSessionVariables(response, req);
    res.render('reset', response);
  }
);

router.post('/reset/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  rUtil.verifyToken('/login', [{ source: 'user', value: 'password' }, { source: 'user', value: 'regdate' }]),
  validator.check('newpass', 'Password must be between 14 and 32 characters').isLength({ min: 14, max: 32 }).bail().isStrongPassword({ minLength: 14 }).withMessage('Password is not strong enough. Please check password requirements.'),
  validator.check('passconf').custom(rUtil.validateFieldMatch('newpass', 'Passwords do not match')),
  rUtil.collectValidationErrors('/reset', { param: 'token' }),
  async function (req, res, next) {
    var user = res.locals.user;
    const hashedPassword = await bcrypt.hash(req.body.newpass, 10);
    mysql.query('UPDATE User SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    req.session.successalert = { strong: "Success!", msg: "You've successfully reset your password. Login to proceed!" };
    if (req.session.fields) {
      req.session.fields.email = user.email;
    }
    else {
      req.session.fields = { email: user.email };
    }
    res.redirect('/login');
  });

/* Logout */
router.delete('/logout', function (req, res) {
  req.logOut();
  res.redirect('/login');
});

router.get('/regcode', auth.checkAuthenticatedAjax, auth.checkAdmin,
  function (req, res, next) {
    var response = { data: {}, error: null };
    response.data.regcode = nanoid(10);
    response.data.regexpire = Date.now() + (1000 * 60 * 60 * 24);
    mysql.query('UPDATE Organization SET regcode = ?, regexpire = ? WHERE id = ?', [response.data.regcode, response.data.regexpire, req.user.orgid], function (error, results, fields) {
      if (error) {
        logger.error(error);
        res.json({ data: null, error: "Something went wrong. Try again later." });
      }
      else {
        res.json(response);
      }
    });
  });

module.exports = router;

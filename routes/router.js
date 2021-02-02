const express = require('express');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const validator = require('express-validator');
const nodemail = require('../email-config');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { nanoid } = require('nanoid');
//const filesRouter = require('./ajax');

/* For Testing */
router.get('/test', function(req, res, next){
  res.render('test', {title: 'Test', scripts: ['test']});
});

async function renderPartial(view, options, res, req){
  return new Promise(function (resolve, reject) {
    options.layout = false;
    res.render(view, options, function (error, html) {
      if(error){
        reject();
        throw error;
      }
      else{
        resolve(html);
      }
    });
  });
}

async function getOrgInfo(id){
  return new Promise(function (resolve, reject) {
    mysql.query('SELECT id, regcode, regexpire FROM Organization WHERE id = ?', [id], function(error, results, fields){
      if(error) throw error;
      resolve({regcode: results[0].regcode, regexpire: results[0].regexpire});
    });
  });
}
/* Home page. */
router.get('/', auth.checkAuthenticated, async function(req, res, next) {
  var response = {title: 'Home', user: req.user, scripts: ['index', 'files', 'account'], styles: ['index']};
  //Render files table
  var table_files = await renderPartial('index/table_files_loading', {}, res, req);
  //Render files tab pane
  response.tab_files = await renderPartial('index/tab_files', {table_files: table_files}, res, req);

  //Render account tab pane
  response.tab_account = await renderPartial('index/tab_account', {user: req.user}, res, req);

  if(req.user.admin){
    //Render users table
    var table_users = await renderPartial('index/table_users_loading', {}, res, req);
    //Render users tab
    var orgInfo = await getOrgInfo(req.user.orgid);
    response.tab_users = await renderPartial('index/tab_users', {user: req.user, regcode: orgInfo.regcode, regexpire: orgInfo.regexpire, table_users: table_users}, res, req);
    response.scripts.push('users');
  }

  if(req.user.superadmin){
    //Render orgs table
    var table_orgs = await renderPartial('index/table_orgs_loading', {}, res, req);
    //Render orgs tab
    response.tab_orgs = await renderPartial('index/tab_orgs', {table_orgs: table_orgs}, res, req);
    response.scripts.push('orgs');
  }
  res.render('index', response);
});

/* Change Password */
router.get('/changepassword', function(req, res, next){
  res.redirect('/');
});

router.post('/changepassword', auth.checkAuthenticated, function(req, res, next){
  res.redirect('/');
});

/* Login Page */
router.get('/login', auth.checkNotAuthenticated, function(req, res, next) {
  const response = {title: 'Login'};
  gatherSessionVariables(response, req);
  res.render('login', response);
});

router.post('/login',
  auth.checkNotAuthenticated,
  captureUserInput,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  collectValidationErrors('/login'),
  auth.authenticate()
);

router.get('/resend',
  auth.checkNotAuthenticated,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  collectValidationErrors('/login'),
  async function(req, res, next){
    var user = await auth.getUserFromEmail(req.query.email);
    sendConfirmation(user.id, user.email, user.fname, user.lname, user.regdate, 'An email has been sent to ' + email + '. Please follow the link in the email to confirm your email address. (Check your spam folder)', res, req);
});

function sendConfirmation(id, email, fname, lname, regdate, success, res, req){
  jwt.sign({data: id}, email + '-' + regdate, function(sign_error, token){
    if(sign_error) throw sign_error;
    nodemail.sendMail(res, 'email_confirm', {title: 'Confirm your email', subject: 'Confirm your email', user: {fname: fname, lname: lname, email: email}, token:'https://files.hanessassociates.com/confirm/'+token}, email);
    req.session.successalert = {strong: 'Success!', msg: success};
    res.redirect('/login');
  });
}

router.get('/invite/:token', auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  verifyToken('/login', [{source: 'user', value: 'email'}, {source: 'org', value: 'regcode'}, {source: 'user', value: 'status'}]),
  function(req, res, next){
    var user = res.locals.user;
    var org = res.locals.org;
    req.session.fields = {};
    req.session.fields.invite = true;
    req.session.fields.org = org.name;
    req.session.fields.regcode = org.regcode;
    req.session.fields.email = user.email;
    res.redirect('/register');
  });
/* Register Page */
router.get('/register', auth.checkNotAuthenticated, function(req, res, next) {
  const response = {title: 'Register'};
  gatherSessionVariables(response, req);
  res.render('register', response);
});

router.post('/register', 
  auth.checkNotAuthenticated, 
  captureUserInput,
  validator.check('fname').trim().notEmpty().withMessage("First name cannot be empty"),
  validator.check('lname').trim().notEmpty().withMessage("Last name cannot be empty"),
  validator.check('regcode').trim().notEmpty().withMessage("Registration code cannot be empty").matches('^[A-Za-z0-9_-]{10}$').withMessage('Invalid Registration Code'),
  validator.check('email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  validator.check('password', 'Password must be between 14 and 32 characters').isLength({min:14, max:32}).bail().isStrongPassword({ minLength: 14 }).withMessage('Password is not strong enough. Please check password requirements.'),
  validator.check('passconf').custom(function(value, { req }){
    if(value !== req.body.password){
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  validator.check('policycheck', 'You must agree to our Terms and Conditions and Privacy Policy before you may register.').exists(),
  collectValidationErrors('/register'),
  checkEmailNotUsed,
  auth.assignOrganization,
  async function(req, res, next) {
    try {
      //Create user in DB
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      var regdate = Date.now();
      var user = await auth.getUserFromEmail(req.body.email);
      var query = {
        command: 'INSERT INTO User (fname, lname, orgid, email, password, regdate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [req.body.fname, req.body.lname, res.locals.org, req.body.email, hashedPassword, regdate, 1]};
      if(res.locals.invite){
        query.command = 'UPDATE User SET fname = ?, lname = ?, password = ?, regdate = ?, status = ? WHERE email = ?';
        query.args = [req.body.fname, req.body.lname, hashedPassword, regdate, 1, req.body.email];
      }
      mysql.query(query.command, query.args,
        function(error, result, fields){
          if(!error){
            sendConfirmation((user ? user.id.toString() : result.insertId.toString()), req.body.email, req.body.fname, req.body.lname, regdate, 'Your account has been registered. An email has been sent to ' + req.body.email + '. Please follow the link in the email to confirm your email address. (Check your spam folder)', res, req);
          }
          else{
            logger.error(error);
            req.session.messages = ["Something went wrong, please try again."];
            res.redirect('/register');
          }
      });
    } catch {
      res.redirect('/register');
    }
});

/* Forgot Password Page */
router.get('/forgot', auth.checkNotAuthenticated, function(req, res, next){
  const response = {title: 'Forgot Password'};
  gatherSessionVariables(response, req);
  res.render('forgot', response);
});

router.post('/forgot',
  auth.checkNotAuthenticated,
  captureUserInput, 
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  collectValidationErrors('/forgot'),
async function(req, res, next){
  var user = await auth.getUserFromEmail(req.body.email);
  if(user){
    jwt.sign({data: user.id.toString(), exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)}, user.password + '-' + user.regdate, function(sign_error, token){
      if(sign_error) throw sign_error;
      nodemail.sendMail(res, 'email_resetpassword', {title: 'Reset your password', subject: 'Reset your password', user: user, token:'https://files.hanessassociates.com/reset/'+token}, user.email);
    });
  }
  if(req.session.fields){
    req.session.fields.submitted = true;
  }
  else{
    req.session.fields = {submitted: true};
  }
  res.redirect('/forgot');
});

/* Confirm Email */
router.get('/confirm/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  verifyToken('/login', [{source: 'user', value: 'email'}, {source: 'user', value: 'regdate'}]),
  async function(req, res, next){
    var user = res.locals.user;
    mysql.query('UPDATE User SET emailverified = ? WHERE id = ?', [1, user.id]);
    req.session.successalert = {strong: "Success!", msg: "You've successfully confirmed your email address. Login to proceed!"};
    if(req.session.fields){
      req.session.fields.email = user.email;
    }
    else{
      req.session.fields = {email: user.email};
    }
    res.redirect('/login');
  }
);

/* Reset Password */
router.get('/reset/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  verifyToken('/login', [{source: 'user', value: 'password'}, {source: 'user', value: 'regdate'}]),
  function(req, res, next) {
    var token = req.params.token;
    const response = { title: 'Reset Password', token: token, user: res.locals.user};
    gatherSessionVariables(response, req);
    res.render('reset', response);
  }
);

router.post('/reset/:token',
  auth.checkNotAuthenticated,
  validator.check('token', 'Invalid URL').isJWT(),
  verifyToken('/login', [{source: 'user', value: 'password'}, {source: 'user', value: 'regdate'}]),
  validator.check('newpass', 'Password must be between 14 and 32 characters').isLength({min:14, max:32}).bail().isStrongPassword({ minLength: 14 }).withMessage('Password is not strong enough. Please check password requirements.'),
  validator.check('passconf').custom(validateFieldMatch('newpass', 'Passwords do not match')),
  collectValidationErrors('/reset', {param: 'token'}),
  async function(req, res, next) {
    var user = res.locals.user;
    const hashedPassword = await bcrypt.hash(req.body.newpass, 10);
    mysql.query('UPDATE User SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    req.session.successalert = {strong: "Success!", msg: "You've successfully reset your password. Login to proceed!"};
    if(req.session.fields){
      req.session.fields.email = user.email;
    }
    else{
      req.session.fields = {email: user.email};
    }
    res.redirect('/login');
});

/* Logout */
router.delete('/logout', function(req, res){
  req.logOut();
  res.redirect('/login');
});

router.get('/users', auth.checkAuthenticatedAjax, auth.checkAdmin, async function(req, res, next){
  const statusStr = ['Disabled', 'Active', 'Invite Sent'];
  var renderObject = {layout: false};
  renderObject.users = [];
  mysql.query('SELECT id, email, fname, lname, regdate, status FROM User WHERE orgid = ?', [req.user.orgid], function(error, results, fields){
    if(!error){
      for(result of results){
        renderObject.users.push({id: result.id, email: result.email, name: result.fname + ' ' + result.lname, regdate: new Date(result.regdate).toDateString(), status: statusStr[result.status], disabled: result.status == 0});
      }
      res.render('index/table_users', renderObject);
    }
    else{
      logger.error(error);
      res.json({data: null, error: "Something went wrong."});
    }
  });
});

router.get('/users/status/:id/:status', auth.checkAuthenticatedAjax, auth.checkAdmin,
  validator.check('id').isInt().toInt(),
  validator.check('status').isInt({min: 0, max: 1}).toInt(),
  collectValidationErrors('/'),
  function(req, res, next){
    mysql.query('UPDATE User SET status = ? WHERE id = ? and orgid = ?', [req.params.status, req.params.id, req.user.orgid], function(error, results, fields){
      if(error) throw error;
      res.json({data: true, error: null});
    });
});

router.get('/orgs', auth.checkAuthenticatedAjax, auth.checkSuperAdmin, function(req, res, next){
  const statusStr = ['Disabled', 'Active', 'Invite Sent'];
  var renderObject = {layout: false};
  renderObject.orgs = [];
  mysql.query('SELECT id, name, dirkey, status FROM Organization', function(error, results, fields){
    if(!error){
      for(result of results){
        renderObject.orgs.push({id: result.id, name: result.name, dirkey: result.dirkey, status: statusStr[result.status], disabled: result.status == 0});
      }
      res.render('index/table_orgs', renderObject);
    }
    else{
      logger.error(error);
      res.json({data: null, error: "Something went wrong."});
    }
  });
});

router.get('/orgs/status/:orgid/:status', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('orgid').isInt().toInt(),
  validator.check('status').isInt({min: 0, max: 1}).toInt(),
  collectValidationErrors('/'),
  function(req, res, next){
    mysql.query('UPDATE Organization SET status = ? WHERE id = ?', [req.params.status, req.params.orgid], function(error, results, fields){
      if(error) throw error;
      res.json({data: true, error: null});
    });
});

router.post('/orgs/create', auth.checkAuthenticatedAjax, auth.checkSuperAdmin,
  validator.check('org_name').trim().notEmpty().withMessage("Organization name cannot be empty"),
  validator.check('org_email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  collectValidationErrors(null),
  checkEmailNotUsedAjax('body', 'org_email'),
  function(req, res, next){
    var regcode = nanoid(10);
    var regexpire = Date.now() + (1000 * 60 * 60 * 24);
    mysql.query('INSERT INTO Organization (name, dirkey, regcode, regexpire, status) VALUES (?, ?, ?, ?, ?)', [req.body.org_name, req.body.org_name, regcode, regexpire, 2], function(error, result, fields){
      if(error) throw error;
      var orgid = result.insertId.toString();
      mysql.query('INSERT INTO User (email, fname, lname, orgid, status, isadmin) VALUES (?, ?, ?, ?, ?, ?)', [req.body.org_email, ' ', ' ', orgid, 2, true], function(error, result, fields){
        if(error) throw error;
        var userid = result.insertId.toString();
        sendInvite('email_invitation_org', {
          id: userid,
          email: req.body.org_email,
          regcode: regcode, 
          regexpire: regexpire,
          org: req.body.org_name,
          sender: req.user.email
        }, res, function(){
          res.json({data: {success: "An email has been sent to " + req.body.org_email + " with instructions to register their account. The registration link included in the email will expire in 24 hours. Return to this screen and use the \"Resend\" button if the invitation expires before they can register."}, error: null});
        });
      });
    });
});

function sendInvite(template, options, res, callback){
  jwt.sign({data: options.id, exp: Math.floor(options.regexpire/1000)}, options.email + '-' + options.regcode + '-2', function(sign_error, token){
    if(sign_error) throw sign_error;
    nodemail.sendMail(res, template, {title: 'Register Your Account', subject: 'Register Your Account', invite: {org: options.org, email: options.email, sender: options.sender}, user: {org: options.org}, token:'https://files.hanessassociates.com/invite/'+token}, options.email);
    callback();
  });
}

router.get('/regcode', auth.checkAuthenticatedAjax, auth.checkAdmin,
  function(req, res, next){
    var response = {data: {}, error: null};
      response.data.regcode = nanoid(10);
      response.data.regexpire = Date.now() + (1000 * 60 * 60 * 24);
      mysql.query('UPDATE Organization SET regcode = ?, regexpire = ? WHERE id = ?', [response.data.regcode, response.data.regexpire, req.user.orgid], function(error, results, fields){
        if(error){
          logger.error(error);
          res.json({data: null, error: "Something went wrong. Try again later."});
        }
        else{
          res.json(response);
        }
      });
});

/*Save user input to session so forms can be repopulated in the event of an error*/
function captureUserInput(req, res, next){
  var fields = {};
  for(field in req.body){
    fields[field] = req.body[field];
  }
  if(req.session.fields){
    Object.assign(req.session.fields, fields);
  }
  else{
    req.session.fields = fields;
  }
  next();
}

function collectValidationErrors(redirect, options={}){
  return function(req, res, next){
    const errors = validator.validationResult(req);
    if(!errors.isEmpty()){
      if(!redirect){
        res.json({data: null, errors: errors.array()});
      }
      else{
        req.session.errors = JSON.stringify(errors.array());
        res.redirect(redirect + (options.param ? '/'+req.params[options.param] : ''));
      }
    }
    else{
      next();
    }
  }
}

//email location example: 'body' 'org_email'
function checkEmailNotUsedAjax(varLoc='body', varName='email'){
  return function(req, res, next){
    try {
      mysql.query('SELECT email, status FROM User WHERE email = ?', [req[varLoc][varName]],
        function(error, results, fields){
          if(!error){
            if(results.length > 0){
              return res.json({data: null, errors: [{msg: "There is already an account registered with that email address."}]});
            }
            else{
              return next();
            }
          }
          else{
            logger.error(error);
            return res.json({data: null, errors: [{msg: "Something went wrong."}]});
          }
      });
    }catch{}
  }
}

function checkEmailNotUsed(req, res, next){
  try {
    mysql.query('SELECT email, status FROM User WHERE email = ?', [req.body.email],
      function(error, results, fields){
        if(!error){
          if(results.length > 0){
            if(results[0].status == 2){
              res.locals.invite = true;
              return next();
            }
            else{
              req.session.messages = ["There is already an account registered with that email address."];
              return res.redirect('/register');
            }
          }
          else{
            return next();
          }
        }
        else{
          logger.error(error);
          req.session.messages = ["Something went wrong, please try again."];
          res.redirect('/register');
        }
    });
  }catch{}
}

function gatherSessionVariables(responseObject, req){
  if('messages' in req.session){
    responseObject.messages = req.session.messages;
    delete req.session.messages;
  }
  if('errors' in req.session){
    responseObject.errors = JSON.parse(req.session.errors);
    delete req.session.errors;
  }
  if('fields' in req.session){
    Object.assign(responseObject, req.session.fields);
    delete req.session.fields;
  }
  if('successalert' in req.session){
    responseObject.successalert = req.session.successalert;
    delete req.session.successalert;
  }
}

function validateFieldMatch(otherField, msg){
  return function(value, { req }){
    if(value !== req.body[otherField]){
      throw new Error(msg);
    }
    return true;
  };
};

//Secret sauce [{source: user, value: regdate}]
function verifyToken(redirect, secretSauce){
  return async function(req, res, next){ 
    try{
      var token = req.params.token;
      var decodedId = jwt.decode(token).data;
      var verifData = {};
      verifData.user = await auth.getUserFromId(decodedId);
      verifData.org = await auth.getOrgFromId(verifData.user.orgid);
      res.locals.user = verifData.user;
      res.locals.org = verifData.org;
      var secrets = [];
      for(piece of secretSauce){
        secrets.push(verifData[piece.source][piece.value]);
      }
      jwt.verify(token, secrets.join('-'), function(error, decoded){
        if(!error){
          return next();
        }
        else{
          req.session.messages = ['Bad URL. Something is wrong.']
          res.redirect(redirect);
        }
      });
    }catch(err){
      logger.error(err);
      req.session.messages = ['Bad URL. Something is wrong.']
      res.redirect(redirect);
    }
  }
}

module.exports = router;

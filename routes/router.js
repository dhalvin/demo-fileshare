const express = require('express');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const validator = require('express-validator');
const nodemail = require('../email-config');
const jwt = require('jsonwebtoken');
const router = express.Router();

/* For Testing */
router.get('/test', function(req, res, next){
  res.render('test', {title: 'Test', scripts: ['test']});
});

/* Home page. */
router.get('/', auth.checkAuthenticated, function(req, res, next) {
  //var awsResponse = await aws.listOrganizations(req.user.org);
  res.render('index', { title: 'Home', user: req.user, scripts: ['files'], styles: ['index']});
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
  auth.authenticate());

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
  validator.check('regcode').trim().notEmpty().withMessage("Registration code cannot be empty"),
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
  async function(req, res, next) {
    try {
      //Check org code is good
      //Create user in DB
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      var regdate = Date.now();
      mysql.query('INSERT INTO User (fname, lname, orgid, email, password, regdate) VALUES (?, ?, ?, ?, ?, ?)', [req.body.fname, req.body.lname, 1, req.body.email, hashedPassword, regdate],
        function(error, result, fields){
          if(!error){
            jwt.sign({data: result.insertId.toString()}, req.body.email + '-' + regdate, function(sign_error, token){
              if(sign_error) throw sign_error;
              nodemail.sendMail(res, 'email_confirm', {title: 'Confirm your email', subject: 'Confirm your email', user: {fname: req.body.fname, lname: req.body.lname, email: req.body.email}, token:'https://files.hanessassociates.com/confirm/'+token}, req.body.email);
              req.session.successalert = {strong: 'Success!', msg: 'Your account has been registered. An email has been sent to ' + req.body.email + '. Please follow the link in the email to confirm your email address. (Check your spam folder)'};
              res.redirect('/login');
            });
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
  verifyToken('/login', 'email'),
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
  verifyToken('/login', 'password'),
  function(req, res, next) {
    var token = req.params.token;
    const response = { title: 'Reset Password', token: token, user: res.locals.user};
    gatherSessionVariables(response, req);
    res.render('reset', response);
  }
);

router.post('/reset/:token',
  auth.checkNotAuthenticated,
  verifyToken('/login', 'password'),
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
      req.session.errors = JSON.stringify(errors.array());
      res.redirect(redirect + (options.param ? '/'+req.params[options.param] : ''));
    }
    else{
      next();
    }
  }
}

function checkEmailNotUsed(req, res, next){
  try {
    mysql.query('SELECT email FROM User WHERE email = ?', [req.body.email],
      function(error, results, fields){
        if(!error){
          if(results.length > 0){
            req.session.messages = ["There is already an account registered with that email address."];
            return res.redirect('/register');
          }
          else{
            next();
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

function verifyToken(redirect, secretSauce){
  return async function(req, res, next){ 
    try{
      var token = req.params.token;
      var decodedId = jwt.decode(token).data;
      var user = await auth.getUserFromId(decodedId);
      res.locals.user = user;
      jwt.verify(token, user[secretSauce]+'-'+user.regdate, function(error, decoded){
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

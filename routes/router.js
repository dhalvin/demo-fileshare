const express = require('express');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const mysql = require('../db-config');

const passport = require('passport');
const initializePassport = require('../passport-config');
initializePassport(passport, getUserFromEmail, getUserFromId);

const validator = require('express-validator');

const router = express.Router();

/* Home page. */
router.get('/', checkAuthenticated, function(req, res, next) {
  res.render('index', { title: '', fname: req.user.fname });
});

/* Login Page */
router.get('/login', checkNotAuthenticated, function(req, res, next) {
  const response = {title: 'Login'};
  gatherSessionVariables(response, req);
  res.render('login', response);
});

router.post('/login',
  checkNotAuthenticated,
  captureUserInput,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  collectValidationErrors('/login'),
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true
  }));

/* Register Page */
router.get('/register', checkNotAuthenticated, function(req, res, next) {
  const response = {title: 'Register'};
  gatherSessionVariables(response, req);
  res.render('register', response);
});

router.post('/register', 
  checkNotAuthenticated, 
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
      mysql.query('INSERT INTO User (fname, lname, orgid, email, password, regdate) VALUES (?, ?, ?, ?, ?, ?)', [req.body.fname, req.body.lname, 1, req.body.email, hashedPassword, Date.now()],
        function(error, result, fields){
        if(!error){
          res.redirect('/login');
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
router.get('/forgot', checkNotAuthenticated, function(req, res, next){
  const response = {title: 'Forgot Password'};
  gatherSessionVariables(response, req);
  res.render('forgot', response);
});

router.post('/forgot',
  checkNotAuthenticated,
  captureUserInput, 
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  collectValidationErrors('/forgot'),
function(req, res, next){
  var fields = JSON.parse(req.session.fields);
  fields.submitted = true;
  req.session.fields = JSON.stringify(fields);
  res.redirect('/forgot');
});

/* Logout */
router.delete('/logout', function(req, res){
  req.logOut();
  res.redirect('/login');
});

function checkAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    next();
  }
  else{
    res.redirect('/login');
  }
}

function checkNotAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    res.redirect('/');
  }
  else{
    next();
  }
}

/*Save user input to session so forms can be repopulated in the event of an error*/
function captureUserInput(req, res, next){
  var fields = {};
  for(field in req.body){
    fields[field] = req.body[field];
  }
  req.session.fields = JSON.stringify(fields);
  next();
}

function collectValidationErrors(redirect){
  return function(req, res, next){
    const errors = validator.validationResult(req);
    if(!errors.isEmpty()){
      req.session.errors = JSON.stringify(errors.array());
      res.redirect(redirect);
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

function gatherSessionVariables(responseObect, req){
  if('messages' in req.session){
    responseObect.messages = req.session.messages;
    delete req.session.messages;
  }
  if('errors' in req.session){
    responseObect.errors = JSON.parse(req.session.errors);
    delete req.session.errors;
  }
  if('fields' in req.session){
    const fields = JSON.parse(req.session.fields);
    Object.assign(responseObect, fields);
    delete req.session.fields;
  }
}

async function getUserFromEmail(email){
  return new Promise(function(resolve, reject){
    mysql.query('SELECT id, fname, lname, email, password, orgid FROM User WHERE email = ?', [email],
    function(error, results, fields){
      if(!error){
        if(results.length > 0){
        resolve({
          id: results[0].id,
          fname: results[0].fname,
          lname: results[0].lname,
          email: results[0].email,
          password: results[0].password.toString(),
          orgid: results[0].orgid});
        }
        else{
          resolve(null);
        }
      }
      else{
        logger.error(error);
        req.session.messages = ["Something went wrong, please try again."];
        resolve(null);
      }
    });
  });
}

async function getUserFromId(id){
  return new Promise(function(resolve, reject){
    mysql.query('SELECT id, fname, lname, email, password, orgid FROM User WHERE id = ?', [id],
    function(error, results, fields){
      if(!error){
        if(results.length > 0){
          resolve({
            id: results[0].id,
            fname: results[0].fname,
            lname: results[0].lname,
            email: results[0].email,
            password: results[0].password.toString(),
            orgid: results[0].orgid});
          }
          else{
            resolve(null);
          }
      }
      else{
        logger.error(error);
        req.session.messages = ["Something went wrong, please try again."];
        resolve(null);
      }
    });
  });
}
module.exports = router;

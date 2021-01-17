const express = require('express');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const mysql = require('../db-config');

const passport = require('passport');
const initializePassport = require('../passport-config');
initializePassport(
  passport, 
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);

const validator = require('express-validator');

const router = express.Router();

//TODO DB
const users = [];
/* Home page. */
router.get('/', checkAuthenticated, function(req, res, next) {
  res.render('index', { title: '' });
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
  async function(req, res, next) {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      users.push({
        id: Date.now().toString(),
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        password: hashedPassword
      })
      res.redirect('/login');
    } catch {
      res.redirect('/register');
    }
    logger.info(users);
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

module.exports = router;

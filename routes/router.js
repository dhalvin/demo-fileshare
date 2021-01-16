var express = require('express');
var bcrypt = require('bcrypt');
var logger = require('../logger');

var passport = require('passport');
var initializePassport = require('../passport-config');
initializePassport(
  passport, 
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);

var validator = require('express-validator');

var router = express.Router();

//TODO DB
const users = [];
/* Home page. */
router.get('/', checkAuthenticated, function(req, res, next) {
  res.render('index', { title: '' });
});

/* Login Page */
router.get('/login', checkNotAuthenticated, function(req, res, next) {
  const response = {title: 'Login'};
  if('messages' in req.session){
    response.messages = req.session.messages;
    const fields = JSON.parse(req.session.fields);
    Object.assign(response, fields);
    delete req.session.messages;
  }
  if('errors' in req.session){
    response.errors = JSON.parse(req.session.errors);
    const fields = JSON.parse(req.session.fields);
    Object.assign(response, fields);
    delete req.session.errors;
  }
  if('fields' in req.session){
    delete req.session.fields;
  }
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
  if('messages' in req.session){
    response.messages = req.session.messages;
    const fields = JSON.parse(req.session.fields);
    Object.assign(response, fields);
    delete req.session.messages;
  }
  if('errors' in req.session){
    response.errors = JSON.parse(req.session.errors);
    const fields = JSON.parse(req.session.fields);
    Object.assign(response, fields);
    delete req.session.errors;
  }
  if('fields' in req.session){
    delete req.session.fields;
  }
  res.render('register', response);
});

router.post('/register', 
  checkNotAuthenticated, 
  captureUserInput,
  validator.check('fname').trim().notEmpty().withMessage("First name cannot be empty"),
  validator.check('lname').trim().notEmpty().withMessage("Last name cannot be empty"),
  validator.check('regcode').trim().notEmpty().withMessage("Registration code cannot be empty"),
  validator.check('email', 'Please enter a valid email address').trim().notEmpty().withMessage("Email cannot be empty").isEmail().normalizeEmail(),
  validator.check('password', 'Password must be between 14 and 32 characters').isLength({min:14, max:32}).bail().isStrongPassword({ minLength: 14}).withMessage('Password is not strong enough. Please check password requirements.'),
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

module.exports = router;

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

var router = express.Router();

//TODO DB
const users = [];
/* Home page. */
router.get('/', checkAuthenticated, function(req, res, next) {
  res.render('index', { title: '' });
});

/* Login Page */
router.get('/login', checkNotAuthenticated, function(req, res, next) {
  if('messages' in req.session){
    res.render('login', { title: 'Login' , messages: req.session.messages});
    delete req.session.messages;
  }
  else{
    res.render('login', { title: 'Login' });
  }
});

router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureMessage: true
}));

/* Register Page */
router.get('/register', checkNotAuthenticated, function(req, res, next) {
  res.render('register', { title: 'Register' });
});

router.post('/register', checkNotAuthenticated, async function(req, res, next) {
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
module.exports = router;

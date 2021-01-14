var express = require('express');
var router = express.Router();

//TODO DB
const users = [];
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login - Haness & Associates, LLC' });
});

router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Register - Haness & Associates, LLC' });
});

module.exports = router;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('./logger');
var handlebars = require('express-handlebars');
var passport = require('passport');
var methodOverride = require('method-override');
var session = require('express-session');
var dbStore = require('./db-store-config');
dbStore.init(session);

var router = require('./routes/router');
var registerRouter = require('./routes/register');
var loginRouter = require('./routes/login');
var usersRouter = require('./routes/users');
var orgsRouter = require('./routes/orgs');
var filesRouter = require('./routes/files');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', handlebars({extname: '.hbs', defaultLayout: 'layout', helpers: require('./hbs_config').helpers}));
app.set('view engine', 'hbs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  //store: dbStore.store,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.use('/', router);
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/users', usersRouter);
app.use('/orgs', orgsRouter);
app.use('/files', filesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if(err['code'] == 'ECONNREFUSED'){
    reconnectDB();
  }
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function reconnectDB(){
  delete require.cache[require.resolve('./db-config')];
  delete require.cache[require.resolve('./db-store-config')];
  dbStore = require('./db-store-config');
  dbStore.init(session);
}

module.exports = app;

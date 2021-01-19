const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const LOCKOUT_MINUTES = 0.5;
const MAX_LOGIN_ATTEMPTS = 3;
function initialize(passport, getUserByEmail, getUserById, logLoginAttempt) {
  const authenticateUser = async function (email, password, done) {
    const user = await getUserByEmail(email);
    if (user == null) {
      return done(null, false, { message: 'Incorrect Email or Password' });
    }

    try {
      var timetounlock = (1000 * 60 * LOCKOUT_MINUTES) - (Date.now() - user.attempttime);
      if (timetounlock <= 0) {
        //User is always allowed to attempt after timeout
        if (await bcrypt.compare(password, user.password)) {
          //User has successfully logged in
          logLoginAttempt(user.id, 1);
          if(user.verified){
            return done(null, user);
          }
          else{
            return done(null, false, { message: 'You must confirm your email address to proceed. Please check your inbox. (And your spam folder)'});
          }
          
        }
        else {
          //First incorrect attempt
          logLoginAttempt(user.id, 0, true);
          return done(null, false, { message: 'Incorrect Email or Password. Login attempts remaining: ' + (MAX_LOGIN_ATTEMPTS - 1) });
        }
      }
      else {
        //If it has been less than LOCKOUT_MINUTES since the last attempt, we must check the number of attempts
        if (user.loginattempts < MAX_LOGIN_ATTEMPTS) {
          //User has attempts left
          if (await bcrypt.compare(password, user.password)) {
            //User has successfully logged in
            logLoginAttempt(user.id, 1);
            if(user.verified){
              return done(null, user);
            }
            else{
              return done(null, false, { message: 'You must confirm your email address to proceed. Please check your inbox. (And your spam folder)'});
            }
          }
          else {
            //User entered incorrect password
            if (user.loginattempts == MAX_LOGIN_ATTEMPTS - 1) {
              //User has just locked themselves out on this attempt
              logLoginAttempt(user.id, 0);
              return done(null, false, { message: 'Too many failed login attempts. Try again in ' + LOCKOUT_MINUTES + ' minutes.' });
            }
            else {
              //An attempt has been used
              logLoginAttempt(user.id, 0);
              return done(null, false, { message: 'Incorrect Email or Password. Login attempts remaining: ' + (MAX_LOGIN_ATTEMPTS - user.loginattempts - 1) });
            }
          }
        }
        else {
          //User is currently locked out
          return done(null, false, { message: 'Too many failed login attempts. Try again in ' + (timetounlock / 1000 / 60).toFixed(2) + ' minutes.' });
        }
      }
    }
    catch (e) {
      return done(e);
    }
  };
  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
  passport.serializeUser(function (user, done) { return done(null, user.id) });
  passport.deserializeUser(async function (id, done) {
    return done(null, await getUserById(id));
  });
}

module.exports = initialize;
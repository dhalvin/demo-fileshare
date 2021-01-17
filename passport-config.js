const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById){
    const authenticateUser = async function(email, password, done){
        const user = await getUserByEmail(email);
        if (user == null){
            return done(null, false, {message: 'Incorrect Email or Password' });
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect Email or Password' });
            }
        }
        catch(e){
            return done(e);
        }
    };
    passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
    passport.serializeUser(function(user, done){return done(null, user.id)});
    passport.deserializeUser(async function(id, done){
        //var user = await getUserById(id);
        return done(null, await getUserById(id));
    });
}

module.exports = initialize;
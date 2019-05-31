const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

function initLocalStrategy(usersDAO) {

    passport.use('local-signup', new LocalStrategy(async (username, password, done) => {
        if ( username && typeof username !== 'string' ) {
            return done(null, false, { errMsg: 'username must be of type string'});
        }
        if ( password && typeof password !== 'string' ) {
            return done(null, false, { errMsg: 'password must be of type string'});
        }
        try {
            const existingUser = await usersDAO.getUser({ username });
            if (existingUser) {
                console.log('user already exists');
                return done(null, false, {errMsg: 'username already exists'});
            }
            try {
                const newUser = await usersDAO.addLocalUser(username, password);
                return done(null, newUser);
            } catch(err) {
                console.log("Unable to create User")
                console.error(JSON.stringify(err, null, 2))
                return done(null, false, { errMsg: "User validation failed" })
            }
        } catch(err) {
            console.log("Unable to query DB!!")
            console.error(JSON.stringify(err, null, 2))
            return done(err, null)
        }
    }) );

    passport.use('local-login', new LocalStrategy(async (username, password, done) => {
        if ( username && typeof username !== 'string' ) {
            return done(null, false, { errMsg: 'username must be of type string'});
        }
        if ( password && typeof password !== 'string' ) {
            return done(null, false, { errMsg: 'password must be of type string'});
        }
        try {
            const existingUser = await usersDAO.getUser({ username });
            if (existingUser) {
                try {
                    const isMatch = await usersDAO.comparePassword(password, existingUser.password)
                    if (isMatch) {
                        return done(null, existingUser._id);
                    } else {
                        return done(null, false, { errMsg: "Username/Password does not match" })
                    }
                } catch(err) {
                    console.log("Unable to check for match")
                    console.error(JSON.stringify(err, null, 2))
                    return done(err, null)
                }
            } else {
                return done(null, false, {errMsg: 'User does not exist, please signup.'});
            }
        } catch(err) {
            console.log("Unable to query DB!!")
            console.error(JSON.stringify(err, null, 2))
            return done(err, null)
        }
    }) );
}

module.exports = initLocalStrategy
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function initGoogleStrategy(usersDAO) {

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/auth/google/callback',
                proxy: true,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const existingUser = await usersDAO.getUser({ googleId: profile.id });
                    if (existingUser) {
                        return done(null, existingUser._id);
                    }
                    try {
                        const newUser = await usersDAO.addGoogleUser(profile);
                        // console.log({newUser})
                        return done(null, newUser);
                    } catch (err) {
                        console.log("Unable to create new User!")
                        console.error(JSON.stringify(err, null, 2))
                        return done(err, null)
                    }
                } catch(err) {
                    console.log("Unable to query DB!!")
                    console.error(JSON.stringify(err, null, 2))
                    return done(err, null)
                }
            },
        ),
    );
}

module.exports = initGoogleStrategy
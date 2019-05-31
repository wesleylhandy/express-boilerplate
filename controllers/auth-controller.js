const router = require('express').Router();
const ensureAuthentication = require('../utils/ensureAuthentication');
const asyncMiddleware = require('../utils/async-middleware')
const passport = require('passport')

module.exports = ( app, usersDAO ) => {

    router.get("/current-user", ensureAuthentication, asyncMiddleware( async (req, res, next) => {
        const { id } = req.query
        try {
            const profile = await usersDAO.getUser({ id })
            res.json(profile)
        } catch(err) {
            res.statusCode = 500;
            res.json({err})
        }
    }) );

    router.get("/google", passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login','https://www.googleapis.com/auth/userinfo.email'], access_type: 'offline'}));

    router.get('/google/callback', passport.authenticate('google'), (req, res, next) => {
        if (req.user) {
            res.json({id:req.user})
        } else {
            res.statusCode = req.statusCode;
            res.json({ id: "", message: req.statusMessage });
        }
    })

    router.post('/login', passport.authenticate('local-login'), (req, res, next) => {
        if (req.user) {
            res.json({id:req.user})
        } else {
            res.statusCode = 401;
            res.json({ id: "", message: req.statusMessage });
        }
    })

    router.post('/logout', (req, res, next) => {
        req.logout();
        res.json({user: ''})
    })

    router.get('/session', (req, res) => {
        if (process.env.NODE_ENV !== 'production') {
            //log of session data retrieved from request for setting state
            console.log('----------/api/session----------');
            console.log({ authenticated: req.isAuthenticated() });
            console.log({ id: req.user });
            console.log('--------------------------------');
        }

        if (req.isAuthenticated()) {
            res.json({ id: req.user, isAuth: true })
        } else res.json({ id: "", isAuth: false })
    })

    router.post('/signup', passport.authenticate('local-signup') ,(req, res, next) => {
        if (req.user) {
            res.json({id:req.user})
        } else {
            res.statusCode = 401;
            res.json({ id: "", message: req.statusMessage });
        }
    })

    app.use('/auth', router);
    
}
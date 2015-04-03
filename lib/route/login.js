
/*
 *  Contain handlers for dealing with user account:
 *      - login
 *      - logout
 *      TODO
 *      - register
 *      - forget password
 *
 *  Module exports FUNCTION that create a router object,
 *  not the router itself!
 *  Exported function gets passport object.
 * */
'use strict';

module.exports = function(passport) {

    var express = require('express');
    var router  = express.Router();

    router.get('/login', function(req, res){
        res.render('login');
    });

    router.post('/login',
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login',
        })
    );

    router.get('/logout', function(req, res){
        req.logout();
        res.redirect('/');
    });

    return router;
};

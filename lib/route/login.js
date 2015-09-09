
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

var model = require('../model/db'),
validator = require('validator');

module.exports = function(passport) {

    var express = require('express');
    var router  = express.Router();

    router.get('/login', function(req, res){
        res.render('login', { title : 'Time Off Management' });
    });

    router.post('/login',

        function(req, res, next) {
            passport.authenticate('local', function(err, user, info) {
                if (err) { return next(err); }

                if (!user) {
                    req.session.flash_error('Incorrect credentials');
                    return res.redirect_with_session('/login');
                }

                req.logIn(user, function(err) {
                    if (err) { return next(err); }

                    req.session.flash_message('Welcome back '+user.name+'!');

                    res.redirect_with_session('/');
                });
            })(req, res, next);
        }
    );

    router.get('/logout', function(req, res){

        // Maybe this check is redundant but to be on safe side lets do it
        if ( !req.user ) {
            return res.redirect_with_session(303, '/');
        }

        req.logout();

        res.redirect_with_session(res.locals.url_to_the_site_root);
    });

    router.get('/register', function(req, res){

        res.render('register');
    });

    router.post('/register', function(req, res){

        // TODO at some point we need to unified form validation code
        // and make it reusable

        var email_validation_re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

        var email = req.param('email');
        if (!email){
            req.session.flash_error('Email was not provided');
        } else if ( ! email_validation_re.test( email )) {
            req.session.flash_error('Email address is invalid');
        }

        var name = req.param('name');
        if (!name){
            req.session.flash_error('Name was not specified');
        }

        var lastname = req.param('lastname');
        if (!lastname) {
            req.session.flash_error('Last was not specified');
        }

        var company_name = req.param('company_name');
        // TODO this is copy/paste from editing company name controller and should
        // be eliminated
        if (!validator.matches(company_name, /^[a-z0-9 \.\,]+$/i)){
          req.session.flash_error('Company name should contain only letters and numbers');
        }

        var password = req.param('password');
        if (!password) {
            req.session.flash_error('Password could not be blank');
        } else if ( password !== req.param('password_confirmed') ) {
            req.session.flash_error('Confirmed password does not match initial one');
        }

        // In case of validation error redirect back to registration form
        if ( req.session.flash_has_errors() ) {
            return res.redirect_with_session('/register/');
        }

        // Try to create new record of user
        model.User.register_new_admin_user({
            email        : email,
            password     : password,
            name         : name,
            lastname     : lastname,
            company_name : company_name,
        })
        .then(function(user){

            req.session.flash_message(
                'Registration is complete. You can login to the system'
            );

            // NOTE maybe automatically login user and redirect to the dashboard?
            res.redirect_with_session('/login/');
        })
        .catch(function(error){
            console.error(
                'An error occurred when trying to register new user '
                    + email + ' : ' + error
            );

            req.session.flash_error(
                'Failed to register user please contact customer service'
            );

            res.redirect_with_session('/register/');
        });

    });

    return router;
};

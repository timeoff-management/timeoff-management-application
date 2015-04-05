
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

var model = require('../model/db');

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

    router.get('/register', function(req, res){

        res.render('register');
    });

    router.post('/register', function(req, res){

        var error_messages = [];

        // TODO at some point we need to unified form validation code
        // and make it reusable

        var email_validation_re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

        var email = req.param('email') || '';
        if (!email){
            error_messages.push('Email was not provided');
        } else if ( ! email_validation_re.test( email )) {
            error_messages.push('Email address is invalid');
        }

        var name = req.param('name') || '';
        if (!name){
            error_messages.push('Name was not specified');
        }

        var lastname = req.param('lastname') || '';
        if (!lastname) {
            error_messages.push('Last was not specified');
        }        

        var password = req.param('password') || '';
        if (!password) {
            error_messages.push('Password could not be blank');
        } else if ( password !== req.param('password_confirmed') ) {
            error_messages.push('Confirmed password does not match initial one');
        }

        // In case of validation error redirect back to registration form
        if ( error_messages.length ) {
            req.session.flash = { errors : error_messages }; 
            return res.redirect('/register/');
        }

        // Try to create new record of user
        model.User.create({
            email    : email,
            password : password,
            name     : name,
            lastname : lastname
        })
        .then(function(user){
            req.session.flash = {
               messages : ['Registration is complete. You can login to the system']
            };
            res.redirect('/register/');
        })
        .catch(function(error){
            console.error(
                'An error occurred when trying to register new user '
                    + email + ' : ' + error
            );

            req.session.flash = {
                errors : ['Failed to register user please contact customer service']
            };

            res.redirect('/register/');
        });
    
    });

    return router;
};

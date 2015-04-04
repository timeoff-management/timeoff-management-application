
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

    router.get('/register', function(req, res){

        var message_obj = req.session.registration_message;
        delete req.session.registration_message;

        var error_messages = [];
        if (message_obj && message_obj.hasOwnProperty('errors')){
            error_messages = message_obj.errors;    
        }
    
        res.render('register', {
            error_messages : error_messages,
        });
    });

    router.post('/register', function(req, res){

        var error_messages = [];


        var email_validation_re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

        var email = req.param('email') || '';
        if (!email){
            error_messages.push('Email was not provided');
        } else if (email_validation_re.test( email )) {
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
            req.session.registration_message = { errors : error_messages }; 
            return res.redirect('/register/');
        }
    
        res.render('register');
    });



    return router;
};

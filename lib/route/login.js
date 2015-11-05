
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

var model      = require('../model/db'),
validator      = require('validator'),
Promise        = require('bluebird'),
EmailTransport = require('../email');

module.exports = function(passport) {

    var express = require('express');
    var router  = express.Router();

    router.get('/login', function(req, res){
        res.render('login', {
            title : 'Time Off Management',
            url_to_the_site_root : req.get('host').indexOf('app.timeoff') < 0 ? '/' : 'http://timeoff.management',
        });
    });

    router.post('/login', function(req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }

        if (!user) {
          req.session.flash_error('Incorrect credentials');
          return res.redirect_with_session('/login');
        }

        req.logIn(user, function(err) {
          if (err) { return next(err); }

          req.session.flash_message('Welcome back '+user.name+'!');

          return res.redirect_with_session('/');
        });
      })(req, res, next);
    });

    router.get('/logout', function(req, res){

        // Maybe this check is redundant but to be on safe side lets do it
        if ( !req.user ) {
            return res.redirect_with_session(303, '/');
        }

        req.logout();

        return res.redirect_with_session(res.locals.url_to_the_site_root);
    });

    router.get('/register', function(req, res){

        res.render('register',{
            url_to_the_site_root : req.get('host').indexOf('app.timeoff') < 0 ? '/' : 'http://timeoff.management',
        });
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
        // Send registration email
        .then(function(user){
          var email = new EmailTransport();

          return email.promise_registration_email({
            user : user,
          })
          .then(function(){
            return Promise.resolve(user)
          });
        })
        .then(function(user){

          // Login newly created user
          req.logIn(user, function(err) {
            if (err) { return next(err); }

            req.session.flash_message(
                'Registration is complete.'
            );

            return res.redirect_with_session('/');
          });

        })
        .catch(function(error){
            console.error(
                'An error occurred when trying to register new user '
                    + email + ' : ' + error
            );

            req.session.flash_error(
              'Failed to register user please contact customer service.'+
                (error.show_to_user ? ' '+ error : '')
            );

            return res.redirect_with_session('/register/');
        });

    });

    router.get('/forgot-password/', function(req, res){

      res.render('forgot_password',{
        url_to_the_site_root : req.get('host').indexOf('app.timeoff') < 0 ? '/' : 'http://timeoff.management',
      });
    });

    router.post('/forgot-password/', function(req, res){
      var email = req.param('email');

      if (!email){
        req.session.flash_error('Email was not provided');

      } else if ( ! validator.isEmail(email)) {
        req.session.flash_error('Email address is invalid');
      }

      // In case of validation error redirect back to forgot password form
      if ( req.session.flash_has_errors() ) {
        return res.redirect_with_session('./');
      }

      var success_msg ='Please check your email box for further instructions';

      model.User.find_by_email(email)
        .then(function(user){

          if (!user) {
            req.session.flash_message(success_msg);

            var error = new Error('');
            error.do_not_report = true;
            throw error;
          }

          return Promise.resolve(user);
        })
        .then(function(user){
          var Email = new EmailTransport();

          return Email.promise_forgot_password_email({
            user : user,
          });
        })
        .then(function(){
            req.session.flash_message(success_msg);
            return res.redirect_with_session('./');
        })
        .catch(function(error){

          if (error.do_not_report ){
            return res.redirect_with_session('./');
          }

          console.error('An error occurred while submittin forgot password form: '+error);
          req.session.flash_error('Failed to proceed with submitted data.');
          return res.redirect_with_session('./');
        });

    });

    router.get('/reset-password/', function(req, res){

      var token = req.param('t');

      model.User.get_user_by_reset_password_token(token)
        .then(function(user){
          if (! user) {
            req.session.flash_error('Unknown reset password link, please submit request again');
            return res.redirect_with_session('/forgot-password/')
          }

          res.render('reset_password',{
            url_to_the_site_root : req.get('host').indexOf('app.timeoff') < 0 ? '/' : 'http://timeoff.management',
            token : token,
          });
        });
    });

    router.post('/reset-password/', function(req, res){

      var token        = req.param('t'),
      password         = req.param('password'),
      confirm_password = req.param('confirm_password');


      if (password !== confirm_password) {
        req.session.flash_error('Confirmed password does not match password');
        return res.redirect_with_session('/reset-password/?t='+token);
      }

      model.User.get_user_by_reset_password_token(token)
        .then(function(user){
          if (! user) {
            req.session.flash_error('Unknown reset password link, please submit request again');
            return res.redirect_with_session('/forgot-password/');
          }

          return Promise.resolve(user);
        })
        .then(function(user){
          user.password = model.User.hashify_password(password);
          return user.save();
        })
        .then(function(user){
          var Email = new EmailTransport();

          return Email.promise_reset_password_email({
            user : user,
          });
        })
        .then(function(){
          req.session.flash_message('Please use new password to login into system');
            return res.redirect_with_session('/login/')
        });
    });

    return router;
};

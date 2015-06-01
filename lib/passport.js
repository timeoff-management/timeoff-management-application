
/*
 *  Module to encapsulate logic for passport instantiation used for
 *  authentication.
 *
 *  Exports function that return instance of passport object.
 *
 * */

'use strict';

var model = require('./model/db');

module.exports = function(){

    var passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy;

    passport.use(new LocalStrategy(
        function(email, password, done) {

            model.User
        
            .find_by_email( email )

            .then(function(user){

                // Case when no user for provided email
                if ( ! user ) {
                    console.error(
                        'At login: failed to find user with provided email '+email
                    );

                    return done(null, false);
                }

                // Provided password is correct
                if (user.is_my_password(password)) {

                    // In case if user is successfully logged in, make sure it is
                    // activated
                    user.maybe_activate()
                      .then(function(){
                        return done(null, user);
                      });

                // User exists but provided password does not match
                } else {
                    console.error(
                        'When login user entered existsing email ' +email+
                        ' but incorrect password'
                    );
                    return done(null, false);
                }
            })

            // there was unknown error when trying to retrieve user object
            .catch(function(error){
                console.error(
                    'At login: unknown error when trying to login in as '+email+
                    '. Error: ' + error
                );

                return done(null, false);
            });
        }
    ));

    // Define how user object is going to be flattered into session
    // after request is processed.
    // In session store we save only user ID
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // Defines how the user object is restored based on data saved
    // in session storage.
    // Fetch user data from DB based on ID.
    passport.deserializeUser(function(id, done) {

        model.User.find({where : {id : id}}).then(function(user){
            done(null, user);
        })
        .catch(function(error){
            console.error('Failed to fetch session user '+id+' with error: '+error);

            done(null, false, { message : 'Failed to fetch session user' });
        });
    });

    return passport;
};


/*
 *  Module to encapsulate logic for passport instantiation used for
 *  authentication.
 *
 *  Exports function that return instance of passport object.
 *
 * */

'use strict';

module.exports = function(){

    var passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy;

    passport.use(new LocalStrategy(
        function(username, password, done) {

            // TODO here there will be authentication
            if (username === 'Pavlo') {
                return done( null, { id : 12, username : 'Pavlo' });
            }

            return done(null, false, { message : 'Incorrect user name!' });
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

        // TODO query DB to get user data.
        done(null, { name : "Pavlo", id : 12 });
    });

    return passport;
};


/*
 *  Module to encapsulate logic for passport instantiation used for
 *  authentication.
 *
 *  Exports function that return instance of passport object.
 *
 * */

'use strict';

var model     = require('./model/db'),
passport      = require('passport'),
LocalStrategy = require('passport-local').Strategy;

// Function that performs authentication of given user object
// by given password.
// The method is callback based and the result is conveyed
// via provided callback function "done"
//
function authenticate_user(args){

  var user = args.user,
  password = args.password,
  done     = args.done;

  // TODO make it dynamic, based on data from related company record
  var is_ldap_auth_enabled = false;

  if ( is_ldap_auth_enabled ) {

    user.getCompany()
      .then(function(company){
        return Promise.resolve( company.get_ldap_server() );
      })
      .then(function(ldap_server){
        email = 'euler'; password = 'password'; // TODO remove this as it for debug only
        console.dir(ldap_server.authenticate);

        ldap_server.authenticate(email, password, function (err, u) {
          if (err) {
            console.log("LDAP auth error: %s", err);
            return done(null, false);
          }
          console.dir(u);
          done(null, user)
        });

        ldap_server.close();
      })
      .catch(function(error){
        console.error('Failed while trying to deal with LDAP server with error: %s', error);

        done(null, false);
      });

  // Provided password is correct
  } else if (user.is_my_password(password)) {

    // In case if user is successfully logged in, make sure it is
    // activated
    user.maybe_activate()
      .then(function(user){
        return user.reload_with_session_details();
      })
      .then(function(){
        done(null, user);
      });

  // User exists but provided password does not match
  } else {
      console.error(
        'When login user entered existsing email ' +email+
        ' but incorrect password'
      );
      done(null, false);
  }
}

function strategy_handler(email, password, done) {

  // Normalize email to be in lower case
  email = email.toLowerCase();

  model.User
    // TODO perhaps we need to include the related company as it wuold be needed further down the line
    .find_by_email( email )
    .then(function(user){

      // Case when no user for provided email
      if ( ! user ) {
        console.error(
          'At login: failed to find user with provided email %s', email
        );

        // We need to abort the execution of current callback function
        // hence the return before calling "done" callback
        return done(null, false);
      }

      // Athenticate user by provided password
      authenticate_user({
        user     : user,
        password : password,
        done     : done,
      });
    })

    // there was unknown error when trying to retrieve user object
    .catch(function(error){
      console.error(
        'At login: unknown error when trying to login in as %s. Error: %s',
        email, error
      );

      done(null, false);
    });
}

module.exports = function(){

  passport.use(new LocalStrategy( strategy_handler ));

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
      return user.reload_with_session_details();
    })
    .then(function(user){
      done(null, user);
    })
    .catch(function(error){
      console.error('Failed to fetch session user '+id+' with error: '+error);

      done(null, false, { message : 'Failed to fetch session user' });
    });
  });

  return passport;
};

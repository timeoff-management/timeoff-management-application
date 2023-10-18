/*
 *  Module to encapsulate logic for passport instantiation used for
 *  authentication.
 *
 *  Exports function that return instance of passport object.
 *
 * */

'use strict'

const model = require('../model/db')
const passport = require('passport')
const Promise = require('bluebird')
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const getCompanyAdminByToken = require('./getCompanyAdminByToken')
const config = require('../config')

// In case if user is successfully logged in, make sure it is
// activated
function prepare_user_for_session(args) {
  const user = args.user
  const done = args.done

  user
    .maybe_activate()
    .then((user) => user.reload_with_session_details())
    .then(() => {
      done(null, user)
    })
}

// Function that performs authentication of given user object
// by given password.
// The method is callback based and the result is conveyed
// via provided callback function "done"
//
function authenticate_user({ user, password, done }) {
  const email = user.email

  /*
   * In case of LDAP authentification connect the LDAP server
   */
  if (user.company.ldap_auth_enabled) {
    // email = 'euler@ldap.forumsys.com'; password = 'password'; // TODO remove
    Promise.resolve(user.company.get_ldap_server())
      .then((ldap_server) => {
        ldap_server.authenticate(email, password, (err, u) => {
          ldap_server.close()

          if (err) {
            console.log('LDAP auth error: %s', err)
            return done(null, false)
          }

          prepare_user_for_session({
            user,
            done
          })
        })

        ldap_server.close()
      })
      .catch((error) => {
        console.error(
          'Failed while trying to deal with LDAP server with error: %s',
          error,
          error.stack
        )

        done(null, false)
      })

    return
  }

  /**
   * Local authentication
   */

  // Check if the provided password is correct
  if (!user.is_my_password(password)) {
    console.error(
      'When login user entered existing email ' +
        email +
        ' but incorrect password'
    )
    done(null, false)
    return
  }

  // Authenticate the user
  prepare_user_for_session({
    user,
    done
  })
}

function strategy_handler(email, password, strategy, done) {
  let authFunction
  switch (strategy) {
    case 'local':
      authFunction = function({ user, password, done }) {
        authenticate_user({ user, password, done })
      }
      break
    case 'google':
      authFunction = function({ user, email, done }) {
        let domain
        domain = email.split('@')
        if (domain && domain.length > 0) {
          domain = domain[domain.length - 1]
        } else {
          domain = false
        }

        if (!domain) {
          return done('no auth domain')
        }

        // check if valid domain
        const validDomains = config.get('login').google || false
        if (!validDomains) {
          console.error('no valid domains')

          return done('no valid domains for google set')
        }

        if (validDomains.indexOf(domain) == -1) {
          console.error('valid domains: ', validDomains, 'not valid: ', domain)

          return done('invalid auth domain')
        }

        prepare_user_for_session({
          user,
          done
        })
      }
      break
    default:
      return done('invalid strategy: ' + strategy)
  }

  // Normalize email to be in lower case
  email = email.toLowerCase()

  model.User.find_by_email(email)
    .then((user) => {
      // Case when no user for provided email
      if (!user) {
        console.error(
          'At login: failed to find user with provided email %s',
          email
        )

        // We need to abort the execution of current callback function
        // hence the return before calling "done" callback
        return done(null, false)
      }

      // Athenticate user by provided password
      user.getCompany().then((company) => {
        // We need to have company for user fetchef dow the line so query it now
        user.company = company

        authFunction({
          user,
          email,
          password,
          done
        })
      })
    })

    // there was unknown error when trying to retrieve user object
    .catch((error) => {
      console.error(
        'At login: unknown error when trying to login in as %s. Error: %s',
        email,
        error,
        error.stack
      )

      done(null, false)
    })
}

module.exports = function() {
  const GoogleStrategy = require('passport-google-oauth20').Strategy

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.get('google').clientID,
        clientSecret: config.get('google').clientSecret,
        callbackURL: config.get('application_domain') + '/auth/google/callback'
      },
      (accessToken, refreshToken, profile, cb) => {
        if (profile.emails && profile.emails.length > 0) {
          const email = profile.emails[0].value
          strategy_handler(email, false, 'google', cb)
        } else {
          console.error('missing email in google reponse - scope?', profile)
          cb('no email found')
        }
      }
    )
  )

  passport.use(
    new LocalStrategy((email, password, done) => {
      strategy_handler(email, password, 'local', done)
    })
  )

  passport.use(
    new BearerStrategy((token, done) => {
      getCompanyAdminByToken({ token, model })
        .then(user => user.reload_with_session_details())
        .then(user => done(null, user))
        .catch(error => {
          console.log(`Failed to authenticate TOKEN. Reason: '${error}'`)
          done(null, false)
        })
    })
  )

  // Define how user object is going to be flattered into session
  // after request is processed.
  // In session store we save only user ID
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  // Defines how the user object is restored based on data saved
  // in session storage.
  // Fetch user data from DB based on ID.
  passport.deserializeUser((id, done) => {
    model.User.findOne({ where: { id } })
      .then((user) => user.reload_with_session_details())
      .then((user) => {
        done(null, user)
      })
      .catch((error) => {
        console.error(
          'Failed to fetch session user ' + id + ' with error: ' + error,
          error.stack
        )

        done(null, false, { message: 'Failed to fetch session user' })
      })
  })

  return passport
}

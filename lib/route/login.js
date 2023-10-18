/*
 *  Contain handlers for dealing with user account:
 *      - login
 *      - logout
 *      - register
 *      - forget password
 *
 *  Module exports FUNCTION that create a router object,
 *  not the router itself!
 *  Exported function gets passport object.
 * */
'use strict'

const validator = require('validator')
const Promise = require('bluebird')
const fs = require('fs')
const config = require('../config')
const moment_tz = require('moment-timezone')
const EmailTransport = require('../email')
const SlackTransport = require('../slack')

const multer = require('multer')
const upload = multer()

Promise.promisifyAll(fs)

const get_url_to_site_root_for_anonymous_session = function(req) {
  return req.get('host').indexOf('app.timeoff') < 0
    ? '/'
    : config.get('promotion_website_domain')
}

module.exports = function(passport) {
  const express = require('express')
  const router = express.Router()

  router.get('/login', (req, res) => {
    res.render('login', {
      login: config.get('login') || { default: true },
      allow_create_new_accounts: JSON.parse(
        config.get('allow_create_new_accounts')
      ),
      title: 'Login  | TimeOff',
      url_to_the_site_root: get_url_to_site_root_for_anonymous_session(req)
    })
  })

  router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['email'] })
  )

  router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect home.
      res.redirect('/')
    }
  )

  router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user) => {
      if (err) {
        return next(err)
      }

      if (!user) {
        req.session.flash_error('Incorrect credentials')
        return res.redirect_with_session('/login')
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err)
        }

        req.session.flash_message('Welcome back ' + user.name + '!')

        return res.redirect_with_session('/')
      })
    })(req, res, next)
  })

  router.get('/logout', (req, res) => {
    // Maybe this check is redundant but to be on safe side lets do it
    if (!req.user) {
      return res.redirect_with_session(303, '/')
    }

    req.logout()

    return res.redirect_with_session(res.locals.url_to_the_site_root)
  })

  router.get('/register', (req, res) => {
    // Disable new accounts.
    if (!JSON.parse(config.get('allow_create_new_accounts'))) {
      return res.redirect_with_session(res.locals.url_to_the_site_root)
    }

    // There is no need to register new accounts when user alreeady login
    if (req.user) {
      return res.redirect_with_session(303, '/')
    }

    res.render('register', {
      url_to_the_site_root: get_url_to_site_root_for_anonymous_session(req),
      countries: config.get('countries'),
      timezones_available: moment_tz.tz.names(),
      title: 'Register new company | TimeOff'
    })
  })

  router.post('/register', (req, res) => {
    // There is no need to register new accounts when user already login
    // (just to prevent people to mess around)
    if (req.user) {
      return res.redirect_with_session(303, '/')
    }

    // TODO at some point we need to unified form validation code
    // and make it reusable

    const email = req.body.email
    if (!email) {
      req.session.flash_error('Email was not provided')
    } else if (!validator.isEmail(email)) {
      req.session.flash_error('Email address is invalid')
    }

    const name = req.body.name

    const slack_username = req.body.slack_username
    if (!slack_username) {
      req.session.flash_error('Slack username was not specified')
    }

    if (!name) {
      req.session.flash_error('Name was not specified')
    }

    const lastname = req.body.lastname
    if (!lastname) {
      req.session.flash_error('Last name was not specified')
    }

    const company_name = req.body.company_name

    const password = req.body.password
    if (!password) {
      req.session.flash_error('Password could not be blank')
    } else if (password !== req.body.password_confirmed) {
      req.session.flash_error('Confirmed password does not match initial one')
    }

    const country_code = req.body.country
    if (!validator.matches(country_code, /^[a-z]{2}/i)) {
      req.session.flash_error('Incorrect country code')
    }

    const timezone = validator.trim(req.body.timezone)
    if (!moment_tz.tz.names().find(tz_str => tz_str === timezone)) {
      req.session.flash_error('Time zone is unknown')
    }

    // In case of validation error redirect back to registration form
    if (req.session.flash_has_errors()) {
      return res.redirect_with_session('/register/')
    }

    // Try to create new record of user
    req.app
      .get('db_model')
      .User.register_new_admin_user({
        email: email.toLowerCase(),
        slack_username: slack_username.toLowerCase(),
        password,
        name,
        lastname,
        company_name,
        country_code,
        timezone
      })
      // Send registration email
      .then((user) => {
        console.log('Sending registration email to ' + user.email)

        const email = new EmailTransport()

        return (
          email
            .promise_registration_email({
              user
            })
            .then(() => Promise.resolve(user))
            // Fail silently for the user and track the error for the administrator.
            .catch((error) => {
              console.error(
                'Failed to send registration email to ' +
                  user.email +
                  ' : ' +
                  error,
                error.stack
              )
              return Promise.resolve(user)
            })
        )
      })
      .then((user) => {
        console.log('Sending Slack notification to ' + user.email)

        const Slack = new SlackTransport()

        return (
          Slack.promise_registration_slack({
            user
          })
            .then(() => Promise.resolve(user))
            // Fail silently for the user and track the error for the administrator.
            .catch((error) => {
              console.error(
                'Failed to send slack notification to ' +
                  user.email +
                  ' : ' +
                  error,
                error.stack
              )
              return Promise.resolve(user)
            })
        )
      })
      .then((user) => {
        console.log('Authenticated the newly created user ' + user.email)

        // Login newly created user
        req.logIn(user, (err) => {
          if (err) {
            return next(err)
          }

          req.session.flash_message('Registration is complete.')

          return res.redirect_with_session('/')
        })
      })
      .catch((error) => {
        console.error(
          'An error occurred when trying to register new user ' +
            email +
            ' : ' +
            error,
          error.stack
        )

        req.session.flash_error(
          'Failed to register user please contact customer service.' +
            (error.show_to_user ? ' ' + error : '')
        )

        return res.redirect_with_session('/register/')
      })
  })

  router.get('/forgot-password/', (req, res) => {
    res.render('forgot_password', {
      url_to_the_site_root: get_url_to_site_root_for_anonymous_session(req),
      title: 'Forgotten password | TimeOff'
    })
  })

  router.post('/forgot-password/', (req, res) => {
    let email = req.body.email

    if (!email) {
      req.session.flash_error('Email was not provided')
    } else if (!validator.isEmail(email)) {
      req.session.flash_error('Email address is invalid')
    }

    // In case of validation error redirect back to forgot password form
    if (req.session.flash_has_errors()) {
      return res.redirect_with_session('./')
    }

    const success_msg = 'Please check your email box for further instructions'

    // Normalize email address: system operates only in low cased emails
    email = email.toLowerCase()

    req.app
      .get('db_model')
      .User.find_by_email(email)
      .then((user) => {
        if (!user) {
          req.session.flash_message(success_msg)

          const error = new Error('')
          error.do_not_report = true
          throw error
        }

        return Promise.resolve(user)
      })
      .then((user) => {
        const Slack = new SlackTransport()

        Slack.promise_forgot_password_slack({
          user
        })

        const Email = new EmailTransport()

        return Email.promise_forgot_password_email({
          user
        })
      })
      .then(() => {
        req.session.flash_message(success_msg)
        return res.redirect_with_session('./')
      })
      .catch((error) => {
        if (error.do_not_report) {
          return res.redirect_with_session('./')
        }

        console.error(
          'An error occurred while submittin forgot password form: ' + error,
          error.stack
        )
        req.session.flash_error('Failed to proceed with submitted data.')
        return res.redirect_with_session('./')
      })
  })

  router.get('/reset-password/', (req, res) => {
    const token = req.query.t

    req.app
      .get('db_model')
      .User.get_user_by_reset_password_token(token)
      .then((user) => {
        if (!user) {
          req.session.flash_error(
            'Unknown reset password link, please submit request again'
          )
          return res.redirect_with_session('/forgot-password/')
        }

        res.render('reset_password', {
          url_to_the_site_root: get_url_to_site_root_for_anonymous_session(req),
          token,
          title: 'Reset password | TimeOff'
        })
      })
  })

  router.post('/reset-password/', (req, res) => {
    const token = req.body.t
    const password = req.body.password
    const confirm_password = req.body.confirm_password

    if (password !== confirm_password) {
      req.session.flash_error('Confirmed password does not match password')
      return res.redirect_with_session('/reset-password/?t=' + token)
    }

    req.app
      .get('db_model')
      .User.get_user_by_reset_password_token(token)
      .then((user) => {
        if (!user) {
          req.session.flash_error(
            'Unknown reset password link, please submit request again'
          )
          return res.redirect_with_session('/forgot-password/')
        }

        return Promise.resolve(user)
      })
      .then((user) => {
        user.password = req.app.get('db_model').User.hashify_password(password)
        return user.save()
      })
      .then((user) => {
        const Slack = new SlackTransport()

        Slack.promise_reset_password_slack({
          user
        })

        const Email = new EmailTransport()

        return Email.promise_reset_password_email({
          user
        })
      })
      .then(() => {
        req.session.flash_message(
          'Please use new password to login into system'
        )
        return res.redirect_with_session('/login/')
      })
  })

  router.post('/import-company/', upload.single('company_dump'), (
    req,
    res
  ) => Promise.resolve()
    .then(() => {
      console.log('req.file', req.file)

      if (req.file.size === 0) {
        throw new Error('No dump file to restore from was provided')
      }

      if (req.file.path && !req.file.buffer) {
        // disk storage
        return fs.readFileAsync(req.file.path, 'utf8')
      }

      // memory storage
      return req.file.buffer.toString()
    })
    .then((dump_json) => Promise.resolve(JSON.parse(dump_json)))
    .then((raw_company_obj) => req.app.get('db_model').Company.restore_from_dump({
      dump_json: raw_company_obj
    }))
    .then((company) => {
      req.session.flash_message('Company ' + company.name + ' was restored')
      res.redirect_with_session('/import-company/')
    })
    .catch((error) => {
      req.session.flash_error(
        'Failed to import company, due to error: ' + error,
        error.stack
      )
      res.redirect_with_session('/import-company/')
    }))

  router.get('/import-company/', (req, res) => {
    res.render('import_company', {
      url_to_the_site_root: get_url_to_site_root_for_anonymous_session(req),
      title: 'Import company | TimeOff'
    })
  })

  return router
}

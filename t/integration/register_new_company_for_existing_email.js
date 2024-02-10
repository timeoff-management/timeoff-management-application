'use strict'

const test = require('selenium-webdriver/testing');
  const config = require('../lib/config');
  const application_host = config.get_application_host();
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const login_user_func = require('../lib/login_with_user');
  const register_new_user_func = require('../lib/register_new_user');
  const logout_user_func = require('../lib/logout_user');
  const submit_form_func = require('../lib/submit_form');
  const add_new_user_func = require('../lib/add_new_user')

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * make sure we are not login
    * try create new acount for the same email as used in first step
    * System should report that such email address could not be used
      and suggest using forget password feature.

*/

describe('Reuse email from existing acount when creating new company', function() {
  this.timeout(config.get_execution_timeout())

  let admin_email, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      admin_email = data.email
      done()
    })
  })

  it('Logout from newly created account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Close the browser', function(done) {
    driver.quit().then(function() {
      done()
    })
  })

  it('Try to create another account with the same email', function(done) {
    register_new_user_func({
      application_host,
      user_email: admin_email,
      failing_error_message:
        'Failed to register user please contact customer service. Error: Email is already used'
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })

  //  after(function() {
  //    if (this.currentTest.state == 'failed') {
  //      driver.takeScreenshot().then(function(image, err) {
  //        return require('fs').writeFile('out.png', image, 'base64', function(err) {
  //            console.log(err);
  //        });
  //      })
  //      .close();
  //
  //
  //    }
  //  });
})

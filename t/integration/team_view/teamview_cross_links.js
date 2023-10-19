'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const Promise = require('bluebird');
  const register_new_user_func = require('../../lib/register_new_user');
  const login_user_func = require('../../lib/login_with_user');
  const open_page_func = require('../../lib/open_page');
  const add_new_user_func = require('../../lib/add_new_user');
  const logout_user_func = require('../../lib/logout_user');
  const check_teamview_func = require('../../lib/teamview_check_user');
  const config = require('../../lib/config');
  const application_host = config.get_application_host()

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (admin)
 *    * Create a new user B (non admin)
 *    * Open Team view page and make sure that both users are as links to Employee details page
 *    * Login as B
 *    * Open Team view and make sure that it shows both users as plain text
 *
 * */

describe('Cross linking on Teamview page', function() {
  this.timeout(config.get_execution_timeout())

  let driver, user_A, user_B

  it('Create new company', function(done) {
    // Performing registration process
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      user_A = data.email
      done()
    })
  })

  it('Create new user B', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      user_B = data.new_user_email
      done()
    })
  })

  it('Make sure that both users are shown on Team view page', function(done) {
    check_teamview_func({
      driver,
      emails: [user_A, user_B],
      is_link: true
    }).then(function() {
      done()
    })
  })

  it('Logout from A account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login as user B', function(done) {
    login_user_func({
      application_host,
      user_email: user_B,
      driver
    }).then(function() {
      done()
    })
  })

  it('Make sure that only user A and B are presented', function(done) {
    check_teamview_func({
      driver,
      emails: [user_A, user_B],
      is_link: false
    }).then(function() {
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

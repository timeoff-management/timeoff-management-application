'use strict'

const test = require('selenium-webdriver/testing');
  const register_new_user_func = require('../lib/register_new_user');
  const login_user_func = require('../lib/login_with_user');
  const add_new_user_func = require('../lib/add_new_user');
  const By = require('selenium-webdriver').By;
  const bluebird = require('bluebird');
  const expect = require('chai').expect;
  const _ = require('underscore');
  const logout_user_func = require('../lib/logout_user');
  const config = require('../lib/config');
  const application_host = config.get_application_host()

/*
 *  Scenario to check in thus test.
 *
 *  * Create new account
 *  * Login into system
 *  * Check that all admin links are available on the menu bar
 *  * Create non admin user
 *  * Login with non-admin user
 *  * Make sure that only limited set of links are available
 *  * Admon features are not available
 *
 * */

describe('Menu bar reflect permissions of logged in user', function() {
  this.timeout(config.get_execution_timeout())

  let ordinary_user_email, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it('Check that all necessary menus are shown', function(done) {
    const promises_to_check = check_presense_promises({
      driver,
      presense: true,
      selectors: [
        'li > a[href="/calendar/"]',
        'li > a[href="/calendar/teamview/"]',
        'li > a[href="/calendar/feeds/"]',
        'li > a[href="/users/"]',
        'li > a[href="/settings/general/"]',
        'li > a[href="/settings/departments/"]',
        'li > a[href="/requests/"]',
        'li > a[href="/logout/"]'
      ]
    })

    bluebird.all(promises_to_check).then(function() {
      done()
    })
  })

  it('Create non-admin user', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      ordinary_user_email = data.new_user_email
      done()
    })
  })

  it('Logout from admin acount', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login as ordinary user', function(done) {
    login_user_func({
      application_host,
      user_email: ordinary_user_email,
      driver
    }).then(function() {
      done()
    })
  })

  it('Check that limited links are there', function(done) {
    const promises_to_check = check_presense_promises({
      driver,
      presense: true,
      selectors: [
        'li > a[href="/calendar/"]',
        'li > a[href="/calendar/teamview/"]',
        'li > a[href="/calendar/feeds/"]',
        'li > a[href="/requests/"]',
        'li > a[href="/logout/"]'
      ]
    })

    bluebird.all(promises_to_check).then(function() {
      done()
    })
  })

  it('Check that admin links are not shown', function(done) {
    const promises_to_check = check_presense_promises({
      driver,
      presense: false,
      selectors: [
        'li > a[href="/users/"]',
        'li > a[href="/settings/general/"]',
        'li > a[href="/settings/departments/"]'
      ]
    })

    bluebird.all(promises_to_check).then(function() {
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

function check_presense_promises(args) {
  const selectors = args.selectors;
    const driver = args.driver;
    const presense = args.presense || false

  const promises_to_check = _.map(selectors, function(selector) {
    return driver.isElementPresent(By.css(selector)).then(function(is_present) {
      expect(is_present).to.be.equal(presense)
      return bluebird.resolve()
    })
  })

  return promises_to_check
}

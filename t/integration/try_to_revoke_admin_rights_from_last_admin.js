'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const register_new_user_func = require('../lib/register_new_user');
  const login_user_func = require('../lib/login_with_user');
  const open_page_func = require('../lib/open_page');
  const submit_form_func = require('../lib/submit_form');
  const check_elements_func = require('../lib/check_elements');
  const add_new_user_func = require('../lib/add_new_user');
  const config = require('../lib/config');
  const user_info_func = require('../lib/user_info');
  const application_host = config.get_application_host()

/*
 * Scenario to ensure system prevent revocking admin rights from very last admin within company.
 *
 *    * Create new account with two users, one admin, one simple employee
 *    * Open edit admin user page, untick the Admin checkbox and try to submit the form
 *    * Ensure it fails
 *    * Grant admin rights to simple employee
 *    * Remove admin ritghs from simple employee, make sure it is suceessful
 *
 * */

describe('System prevent revoking admin rights from very last admin within company', function() {
  this.timeout(config.get_execution_timeout())

  let email_admin, secondary_user, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      email_admin = data.email
      done()
    })
  })

  it('Create second user', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      ;(secondary_user = data.new_user_email), done()
    })
  })

  it('Open Admin user edit details page', function(done) {
    user_info_func({
      driver,
      email: email_admin
    })
      .then(function(data) {
        return open_page_func({
          driver,
          url: application_host + 'users/edit/' + data.user.id + '/'
        })
      })
      .then(function() {
        done()
      })
  })

  it('Ensure that Admin tickbox is checked', function(done) {
    check_elements_func({
      driver,
      elements_to_check: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'on'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Try to untick the Is Admin flag and make sure system prevent from doing it', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'on'
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /This is last admin within company. Cannot revoke admin rights./
    }).then(function() {
      done()
    })
  })

  it('Open detail page for second employee', function(done) {
    user_info_func({
      driver,
      email: secondary_user
    })
      .then(function(data) {
        return open_page_func({
          driver,
          url: application_host + 'users/edit/' + data.user.id + '/'
        })
      })
      .then(function() {
        done()
      })
  })

  it('Ensure that Admin tickbox is not checked', function(done) {
    check_elements_func({
      driver,
      elements_to_check: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'off'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Make secondary user to be admin', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'on'
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/
    }).then(function() {
      done()
    })
  })

  it('Ensure that secondary user bacame admin', function(done) {
    check_elements_func({
      driver,
      elements_to_check: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'on'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Revoke admin rights from secondary user', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="admin"]',
          tick: true,
          value: 'off'
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/
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

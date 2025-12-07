'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const fs = Promise.promisifyAll(require('fs'));
  const csv = Promise.promisifyAll(require('csv'));
  const register_new_user_func = require('../lib/register_new_user');
  const login_user_func = require('../lib/login_with_user');
  const logout_user_func = require('../lib/logout_user');
  const open_page_func = require('../lib/open_page');
  const submit_form_func = require('../lib/submit_form');
  const add_new_user_func = require('../lib/add_new_user');
  const config = require('../lib/config');
  const user_info_func = require('../lib/user_info');
  const application_host = config.get_application_host()

/*
 *  Scenario to check:
 *
 *    * Register new account
 *    * Create 10 unique emails/users
 *    * Put them into CSV and import in bulk
 *    * Ensure that all users were added into
 *      system and they appear on the Users page
 *    * Ensure that newly added users do not have password "undefined"
 *      (as it happened to be after bulk import feature went live)
 *
 * */

describe('Bulk import of users', function() {
  this.timeout(config.get_execution_timeout())

  let email_admin;
    let driver;
    let csv_data;
    let sample_email;
    const test_users_filename = __dirname + '/test.csv'

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(data => {
      driver = data.driver
      done()
    })
  })

  it('Navigate to bulk upload page', function(done) {
    open_page_func({
      url: application_host + 'users/import/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Create test .CSV file for the test', function(done) {
    csv_data = [['email', 'name', 'lastname', 'department']]

    const token = new Date().getTime()
    for (let i = 0; i < 10; i++) {
      csv_data.push([
        'test_csv_' + i + '_' + token + '@test.com',
        'name_csv_' + i + '_' + token + '@test.com',
        'lastname_csv_' + i + '_' + token + '@test.com',
        'Sales'
      ])
    }

    // Safe one of the emails
    sample_email = csv_data[1][0]

    Promise.resolve()
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(err => Promise.resolve())
      .then(() => csv.stringifyAsync(csv_data))
      .then(data => fs.writeFileAsync(test_users_filename, data))
      .then(() => done())
  })

  it('Upload user import file', function(done) {
    const regex = new RegExp(
      'Successfully imported users with following emails: ' +
        csv_data
          .slice(1)
          .map(it => it[0])
          .sort()
          .join(', ')
    )

    submit_form_func({
      submit_button_selector: '#submit_users_btn',
      driver,
      form_params: [
        {
          selector: '#users_input_inp',
          value: test_users_filename,
          file: true
        }
      ],
      message: regex
    }).then(() => done())
  })

  it('Ensure that imported users are in the system', function(done) {
    let users_ids
    // Get IDs of newly added users
    Promise.map(csv_data.slice(1).map(it => it[0]), email => user_info_func({
        driver,
        email
      }).then(data => data.user.id))
      // Open users page
      .then(ids => {
        users_ids = ids

        return open_page_func({
          url: application_host + 'users/',
          driver
        })
      })

      // Ensure that IDs of newly added users are on th Users page
      .then(() =>
        Promise.map(users_ids, id =>
          driver
            .findElement(By.css('[data-vpp-user-row="' + id + '"]'))
            .then(el => {
              expect(
                el,
                'Ensure that newly added user ID ' +
                  id +
                  ' exists on Users page'
              ).to.exists
              return Promise.resolve()
            })
        )
      )

      .then(() => done())
  })

  it('Logout from admin account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Now try to login as newly added employee using "undefined" as password..', function(done) {
    login_user_func({
      application_host,
      user_email: sample_email,
      driver,
      password: 'undefined',
      should_fail: true
    }).then(() => done())
  })

  after(function(done) {
    Promise.resolve()
      .then(() => driver.quit())
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(err => Promise.resolve())
      .then(() => done())
  })
})

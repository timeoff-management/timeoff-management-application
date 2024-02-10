'use strict'

const test = require('selenium-webdriver/testing')
const By = require('selenium-webdriver').By
const expect = require('chai').expect
const _ = require('underscore')
const Promise = require('bluebird')
const moment = require('moment')
const login_user_func = require('../../lib/login_with_user')
const register_new_user_func = require('../../lib/register_new_user')
const logout_user_func = require('../../lib/logout_user')
const open_page_func = require('../../lib/open_page')
const submit_form_func = require('../../lib/submit_form')
const check_elements_func = require('../../lib/check_elements')
const check_booking_func = require('../../lib/check_booking_on_calendar')
const add_new_user_func = require('../../lib/add_new_user')
const leave_type_edit_form_id = '#leave_type_edit_form'
const config = require('../../lib/config')
const application_host = config.get_application_host()

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update Holiday leave type to be limited
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request that exceed limit
 *    - Make sure that system rejected the request
 *    - Submit leave request that is under the limit
 *    - Make sure the system accepted the request
 *
 * */

describe('Leave type limits in action', function() {
  this.timeout(config.get_execution_timeout())

  let non_admin_user_email, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it('Open page with leave types', function(done) {
    open_page_func({
      url: application_host + 'settings/general/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Check that it is possible to update Limits', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="limit_0"]',
          value: '3'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      should_be_successful: true,
      message: /Changes to leave types were saved/
    }).then(function() {
      done()
    })
  })

  it('Create new non-admin user', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      non_admin_user_email = data.new_user_email
      done()
    })
  })

  it('Logout from admin account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login as non-admin user', function(done) {
    login_user_func({
      application_host,
      user_email: non_admin_user_email,
      driver
    }).then(function() {
      done()
    })
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      driver
    }).then(function() {
      done()
    })
  })

  it('And make sure that it is calendar indeed', function(done) {
    driver.getTitle().then(function(title) {
      expect(title).to.be.equal('Calendar')
      done()
    })
  })

  it('Try to request new leave that exceed the limit', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: '2015-06-15'
            },
            {
              selector: 'input#to',
              value: '2015-06-18'
            }
          ],
          message: /Adding requested .* absence would exceed maximum allowed for such type by 1/,
          multi_line_message: true
        }).then(function() {
          done()
        })
      })
  })

  it('Add a request that fits under the limit', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: '2015-06-15'
            },
            {
              selector: 'input#to',
              value: '2015-06-17'
            }
          ],
          message: /New leave request was added/
        })
          // Check that all days are marked as pended
          .then(function() {
            check_booking_func({
              driver,
              full_days: [
                moment('2015-06-16'),
                moment('2015-06-16'),
                moment('2015-06-17')
              ],
              type: 'pended'
            }).then(function() {
              done()
            })
          })
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

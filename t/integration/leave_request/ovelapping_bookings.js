'use strict'

const test = require('selenium-webdriver/testing');
  const until = require('selenium-webdriver').until;
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const moment = require('moment');
  const login_user_func = require('../../lib/login_with_user');
  const register_new_user_func = require('../../lib/register_new_user');
  const logout_user_func = require('../../lib/logout_user');
  const open_page_func = require('../../lib/open_page');
  const submit_form_func = require('../../lib/submit_form');
  const check_elements_func = require('../../lib/check_elements');
  const check_booking_func = require('../../lib/check_booking_on_calendar');
  const add_new_user_func = require('../../lib/add_new_user');
  const config = require('../../lib/config');
  const application_host = config.get_application_host()

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user
 *    - Make sure that leve request is shown as a pending one for non admin user
 *    - Submit another leave request that overlaps with previose,
 *      make sure it failed.
 *
 * */

describe('Overlapping bookings', function() {
  this.timeout(config.get_execution_timeout())

  let non_admin_user_email, new_user_email, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      new_user_email = data.email
      driver = data.driver
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

  it('Logout from admin acount', function(done) {
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
      url: application_host + 'calendar/?show_full_year=1&year=2015',
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

  it('Request new leave', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })

      // Create new leave request
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
              value: '2015-06-16'
            }
          ],
          message: /New leave request was added/
        }).then(function() {
          done()
        })
      })
  })

  it('Check that all days are marked as pended', function(done) {
    check_booking_func({
      driver,
      full_days: [moment('2015-06-15'), moment('2015-06-16')],
      type: 'pended'
    }).then(function() {
      done()
    })
  })

  it('Try to request overlapping leave request', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })

      // Create new leave request
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: '2015-06-16'
            },
            {
              selector: 'input#to',
              value: '2015-06-17'
            }
          ],
          message: /Failed to create a leave request/
        }).then(function() {
          done()
        })
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

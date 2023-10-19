'use strict'

const test = require('selenium-webdriver/testing');
  const config = require('../../lib/config');
  const application_host = config.get_application_host();
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const moment = require('moment');
  const login_user_func = require('../../lib/login_with_user');
  const register_new_user_func = require('../../lib/register_new_user');
  const open_page_func = require('../../lib/open_page');
  const submit_form_func = require('../../lib/submit_form');
  const check_elements_func = require('../../lib/check_elements');
  const check_booking_func = require('../../lib/check_booking_on_calendar');
  const user_info_func = require('../../lib/user_info');
  const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for admin user
 *
 *  There was a bug when in newly created company user (when there is only one account)
 *  tried to create new leave request.
 *
 * */

describe('Leave request with single user', function() {
  this.timeout(config.get_execution_timeout())

  let new_user_email, driver

  it('Create new company', function(done) {
    register_new_user_func({ application_host }).then(data => {
      ;({ driver, email: new_user_email } = data)
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({
      driver,
      email: new_user_email,
      year: 2015
    }).then(() => done())
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      driver
    }).then(function() {
      done()
    })
  })

  it('Open page to create new leave', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        done()
      })
  })

  it('Create new leave request', function(done) {
    // This is very important line when working with Bootstrap modals!
    driver.sleep(1000)

    submit_form_func({
      driver,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [
        {
          selector: 'select[name="from_date_part"]',
          option_selector: 'option[value="2"]',
          value: '2'
        },
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

  it('Check that all days are marked as pended', function(done) {
    check_booking_func({
      driver,
      full_days: [moment('2015-06-16')],
      halfs_1st_days: [moment('2015-06-15')],
      type: 'pended'
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

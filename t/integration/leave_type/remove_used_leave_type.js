'use strict'

const test = require('selenium-webdriver/testing');
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
  const leave_type_edit_form_id = '#leave_type_edit_form';
  const leave_type_new_form_id = '#leave_type_new_form';
  const config = require('../../lib/config');
  const application_host = config.get_application_host();
  const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new leave type (one tath is always at the start of list, e.g. AAA)
 *    - Create pended leave for that type
 *    - Try to remove the type
 *    - Ensure system prevent of doing this
 *
 * */

describe('Try to remove used leave type', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      ;({ driver, email } = data)
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({ driver, email, year: 2015 }).then(() =>
      done()
    )
  })

  it('Open page with leave types', function(done) {
    open_page_func({
      url: application_host + 'settings/general/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Add new leave type', function(done) {
    driver
      .findElement(By.css('#add_new_leave_type_btn'))
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
              selector: leave_type_new_form_id + ' input[name="name__new"]',
              value: 'AAAAA'
            },
            {
              selector:
                leave_type_new_form_id + ' input[name="use_allowance__new"]',
              value: 'on',
              tick: true
            }
          ],
          submit_button_selector:
            leave_type_new_form_id + ' button[type="submit"]',
          message: /Changes to leave types were saved/
        }).then(function() {
          done()
        })
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
          // The order matters here as we need to populate dropdown prior date filds
          form_params: [
            {
              selector: 'select[name="from_date_part"]',
              option_selector: 'option[value="2"]'
            },
            {
              selector: 'select[name="leave_type"]',
              option_selector: 'option[data-tom-index="0"]'
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

  it('Open page with leave types', function(done) {
    open_page_func({
      url: application_host + 'settings/general/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Try to remove newly added leave type and ensure it fails', function(done) {
    submit_form_func({
      driver,
      submit_button_selector:
        leave_type_edit_form_id +
        ' button[data-tom-leave-type-order="remove_0"]',
      message: /Cannot remove leave type: type is in use/
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

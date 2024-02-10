'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const Promise = require('bluebird');
  const moment = require('moment');
  const until = require('selenium-webdriver').until;
  const login_user_func = require('../../lib/login_with_user');
  const register_new_user_func = require('../../lib/register_new_user');
  const logout_user_func = require('../../lib/logout_user');
  const open_page_func = require('../../lib/open_page');
  const submit_form_func = require('../../lib/submit_form');
  const check_booking_func = require('../../lib/check_booking_on_calendar');
  const add_new_user_func = require('../../lib/add_new_user');
  const leave_type_edit_form_id = '#leave_type_edit_form';
  const config = require('../../lib/config');
  const application_host = config.get_application_host();
  const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

const nextYear = moment()
  .add(1, 'y')
  .format('YYYY')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update user to start at the very end of current year: 20 Dec
 *    - Submit leave request for of one week day in next year
 *    - Make sure system allows it
 *
 * */

describe(`Leave in the next year (${nextYear}) when no allowance in the current one`, function() {
  this.timeout(config.get_execution_timeout())

  let email, driver

  it('Create new company', function(done) {
    register_new_user_func({ application_host }).then(data => {
      ;({ driver, email } = data)
      done()
    })
  })

  it('Update user to start at the very end of current year: 20 Dec', function(done) {
    userStartsAtTheBeginingOfYear({
      driver,
      email,
      overwriteDate: moment.utc(`${nextYear - 1}-12-20`)
    }).then(() => done())
  })

  it('Submit leave request for of one week in next year', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: `${nextYear}-01-05`
            },
            {
              selector: 'input#to',
              value: `${nextYear}-01-12`
            }
          ],
          message: /New leave request was added/
        }).then(() => done())
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

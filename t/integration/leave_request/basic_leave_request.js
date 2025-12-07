'use strict'

const test = require('selenium-webdriver/testing')
const config = require('../../lib/config')
const application_host = config.get_application_host()
const By = require('selenium-webdriver').By
const expect = require('chai').expect
const _ = require('underscore')
const Promise = require('bluebird')
const moment = require('moment')
const until = require('selenium-webdriver').until
const login_user_func = require('../../lib/login_with_user')
const register_new_user_func = require('../../lib/register_new_user')
const logout_user_func = require('../../lib/logout_user')
const open_page_func = require('../../lib/open_page')
const submit_form_func = require('../../lib/submit_form')
const check_elements_func = require('../../lib/check_elements')
const check_booking_func = require('../../lib/check_booking_on_calendar')
const user_info_func = require('../../lib/user_info')
const add_new_user_func = require('../../lib/add_new_user')
const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for non admin user
 *    - Login as an admin user and approve leave request
 *    - Login as non admin user and check that new request is now
 *      shown as approved
 *
 * */

describe('Basic leave request', function() {
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

  it('Open Book leave popup window', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function(el) {
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000)
      })
      .then(function() {
        done()
      })
  })

  it('Following code is to ensure that non admin user can request leave only for herself', function(done) {
    driver
      .findElements(By.css('select#employee'))
      .then(found => !!found.length)
      .then(function(is_present) {
        expect(is_present).to.be.equal(false)
        done()
      })
  })

  it('Submit new leave request', function(done) {
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

  it('Logout from non-admin acount', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login as admin user', function(done) {
    login_user_func({
      application_host,
      user_email: new_user_email,
      driver
    }).then(function() {
      done()
    })
  })

  it('Open requests page', function(done) {
    open_page_func({
      url: application_host + 'requests/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Make sure newly created request is shown for approval', function(done) {
    check_elements_func({
      driver,
      elements_to_check: [
        {
          selector:
            'tr[vpp="pending_for__' + non_admin_user_email + '"] .btn-warning',
          value: 'Reject'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Approve newly added leave request', function(done) {
    driver
      .findElement(
        By.css(
          'tr[vpp="pending_for__' + non_admin_user_email + '"] .btn-success'
        )
      )
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // Wait until page properly is reloaded
        return driver.wait(until.elementLocated(By.css('h1')), 1000)
      })
      .then(function() {
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

  it('Open calendar page (in full year mode)', function(done) {
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

  it('Check that all days are marked as pended', function(done) {
    check_booking_func({
      driver,
      full_days: [moment('2015-06-16')],
      halfs_1st_days: [moment('2015-06-15')],
      type: 'approved'
    }).then(function() {
      done()
    })
  })

  it('Open calendar page (short version)', function(done) {
    open_page_func({
      url: application_host + 'requests/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Make sure that requests have approver been populated', function(done) {
    driver
      .findElement(
        By.css('.user-requests-table td.user-request-table-approver')
      )
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.not.empty
        done()
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

describe('Use problematic date with non default date format', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email, user_id

  it('Register new company with default date to be DD/MM/YY', function(done) {
    register_new_user_func({
      application_host,
      default_date_format: 'DD/MM/YY'
    }).then(data => {
      ;({ email, driver } = data)
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({ driver, email, year: 2016 }).then(() =>
      done()
    )
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?year=2016&show_full_year=1',
      driver
    }).then(function() {
      done()
    })
  })

  it('Open Book new leave pop up', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      // This is very important line when working with Bootstrap modals!
      .then(function() {
        return driver.sleep(1000)
      })
      .then(function() {
        done()
      })
  })

  it('Make sure it is possible to place an leave request for date that was reported to be problematic', function(done) {
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
          value: '24/08/16'
        },
        {
          selector: 'input#to',
          value: '25/08/16'
        }
      ],
      message: /New leave request was added/
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

describe('Book the very last day of year to be a holiday', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email

  it('Register new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      ;({ driver, email } = data)
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({ driver, email, year: 2018 }).then(() =>
      done()
    )
  })

  it('Place new holiday to be the very last day of the year', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: '2018-12-31'
            },
            {
              selector: 'input#to',
              value: '2018-12-31'
            }
          ],
          message: /New leave request was added/
        })
      )
      .then(() => done())
  })

  it('Open calendar page and ensure that the very last day of the year is marked as pending', function(done) {
    open_page_func({
      url: application_host + 'calendar/?year=2018&show_full_year=1',
      driver
    })
      .then(() =>
        check_booking_func({
          driver,
          full_days: [moment('2018-12-31')],
          type: 'pended'
        })
      )

      .then(() => done())
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

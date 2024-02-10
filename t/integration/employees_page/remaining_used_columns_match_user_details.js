'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const until = require('selenium-webdriver').until;
  const Promise = require('bluebird');
  const expect = require('chai').expect;
  const moment = require('moment');
  const add_new_user_func = require('../../lib/add_new_user');
  const check_elements_func = require('../../lib/check_elements');
  const config = require('../../lib/config');
  const login_user_func = require('../../lib/login_with_user');
  const logout_user_func = require('../../lib/logout_user');
  const open_page_func = require('../../lib/open_page');
  const register_new_user_func = require('../../lib/register_new_user');
  const submit_form_func = require('../../lib/submit_form');
  const user_info_func = require('../../lib/user_info');
  const application_host = config.get_application_host();
  const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario (based in bug #166):
 *
 *    * Create company
 *    * Obtain admin details and go to admin details page
 *    * Update admin's details to have start date as very beginnign of this year
 *    * Add one week length holiday and approve it
 *    * Check that allowance section of user details page shows "15 out of 20"
 *    * Go to employees list page and make sure used shows 5 and remaining 15
 *    * Initiate revoke procedure (but not finish)
 *    * Go to employees list page and make sure used shows 5 and remaining 15
 *
 * */

describe('Leave request cancelation', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email_A, user_id_A

  it('Register new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      email_A = data.email
      done()
    })
  })

  it('Obtain information about admin user A', function(done) {
    user_info_func({
      driver,
      email: email_A
    }).then(function(data) {
      user_id_A = data.user.id
      done()
    })
  })

  it('Update admin details to have start date at very beginig of this year', function(done) {
    userStartsAtTheBeginingOfYear({
      driver,
      email: email_A
    }).then(() => done())
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

  it('Submit new leave request for user A one weekday', function(done) {
    const currentYear = moment.utc().year()
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input#from',
          value: `${currentYear}-05-01`
        },
        {
          selector: 'input#to',
          value: `${currentYear}-05-07`
        }
      ],
      message: /New leave request was added/
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

  it('Approve new leave request', function(done) {
    driver
      .findElement(
        By.css('tr[vpp="pending_for__' + email_A + '"] .btn-success')
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

  it('Open user A details page (abcenses section)', function(done) {
    open_page_func({
      url: application_host + 'users/edit/' + user_id_A + '/absences/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Check that allowance section of user details page shows "15 out of 20"', function(done) {
    driver
      .findElement(By.css('#days_remaining_inp'))
      .then(function(inp) {
        return inp.getAttribute('value')
      })
      .then(function(text) {
        expect(text).to.be.eq('15 out of 20')
        done()
      })
  })

  it('Open employees list page', function(done) {
    open_page_func({
      url: application_host + 'users',
      driver
    }).then(function() {
      done()
    })
  })

  it('Ensure "remaining" 15', function(done) {
    driver
      .findElement(
        By.css('tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-remaining')
      )
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.eq('15')
        done()
      })
  })

  it('Ensure "used" shows 5', function(done) {
    driver
      .findElement(
        By.css('tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-used')
      )
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.eq('5')
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

  it('Initiate revoke procedure (but not finish)', function(done) {
    driver
      .findElement(By.css('button.revoke-btn'))
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

  it('Open user A details page (abcenses section)', function(done) {
    open_page_func({
      url: application_host + 'users/edit/' + user_id_A + '/absences/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Check that allowance section of user details page shows "15 out of 20"', function(done) {
    driver
      .findElement(By.css('#days_remaining_inp'))
      .then(function(inp) {
        return inp.getAttribute('value')
      })
      .then(function(text) {
        expect(text).to.be.eq('15 out of 20')
        done()
      })
  })

  it('Open employees list page', function(done) {
    open_page_func({
      url: application_host + 'users',
      driver
    }).then(function() {
      done()
    })
  })

  it('Ensure "remaining" 15', function(done) {
    driver
      .findElement(
        By.css('tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-remaining')
      )
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.eq('15')
        done()
      })
  })

  it('Ensure "used" shows 5', function(done) {
    driver
      .findElement(
        By.css('tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-used')
      )
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.eq('5')
        done()
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const Promise = require('bluebird');
  const register_new_user_func = require('../../lib/register_new_user');
  const login_user_func = require('../../lib/login_with_user');
  const logout_user_func = require('../../lib/logout_user');
  const open_page_func = require('../../lib/open_page');
  const submit_form_func = require('../../lib/submit_form');
  const config = require('../../lib/config');
  const application_host = config.get_application_host();
  const company_edit_form_id = '#company_edit_form';
  const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario to test:
 *
 *    * Create Company A
 *    * Book a leave by user from company A
 *    * Created Company B
 *    * Book a leave for admin user from company B
 *    * Login as Admin from company A and remove company's account
 *    ** Ensure user is logged out
 *    ** Ensure it is not possible to login back
 *    * Login as admin of company B
 *    ** ensure that admin still has a leave registered
 *    ** ensure that there are still records in Email audit page
 *
 * */

describe('Remove company account', function() {
  this.timeout(config.get_execution_timeout())

  let driver, emailCompanyA, emailCompanyB

  it('Create Company A', function(done) {
    register_new_user_func({
      application_host
    }).then(data => {
      emailCompanyA = data.email
      driver = data.driver
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({
      driver,
      email: emailCompanyA,
      year: 2018
    }).then(() => done())
  })

  it('Book a leave by user from company A', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'select[name="from_date_part"]',
              option_selector: 'option[value="2"]',
              value: '2'
            },
            {
              selector: 'input#from',
              value: '2018-06-06'
            },
            {
              selector: 'input#to',
              value: '2018-06-06'
            }
          ],
          message: /New leave request was added/
        })
      )
      .then(() => done())
  })

  it('Close down current session', function(done) {
    driver.quit().then(() => done())
  })

  it('Create Company B', function(done) {
    register_new_user_func({
      application_host
    }).then(data => {
      emailCompanyB = data.email
      driver = data.driver
      done()
    })
  })

  it('Ensure user starts at the very beginning of current year', function(done) {
    userStartsAtTheBeginingOfYear({ driver, email: emailCompanyB, year: 2018 })
      .then(() => open_page_func({ url: application_host, driver }))
      .then(() => done())
  })

  it('Book a leave by user from company B', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'select[name="from_date_part"]',
              option_selector: 'option[value="2"]',
              value: '2'
            },
            {
              selector: 'input#from',
              value: '2018-06-07'
            },
            {
              selector: 'input#to',
              value: '2018-06-07'
            }
          ],
          message: /New leave request was added/
        })
      )
      .then(() => done())
  })

  it('Logout from Company B', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(() => done())
  })

  it("Login as Admin from company A and remove company's account", function(done) {
    let companyName

    login_user_func({
      application_host,
      user_email: emailCompanyA,
      driver
    })
      .then(() =>
        open_page_func({
          url: application_host + 'settings/general/',
          driver
        })
      )

      // Try to ignore company name confirmation
      .then(() =>
        driver.findElement(
          By.css('button[data-target="#remove_company_modal"]')
        )
      )
      .then(btn => btn.click())
      .then(() => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input[name="confirm_name"]',
              value: 'blahblahblah'
            }
          ],
          submit_button_selector: '#remove_company_form button[type="submit"]',
          message: /Failed to remove company. Reason: Provided name confirmation does not match company one/
        })
      )

      // Fetch company name
      .then(() => driver.findElement(By.css('#input_company_name')))
      .then(el => el.getAttribute('value'))
      .then(val => Promise.resolve((companyName = val)))

      .then(() =>
        driver.findElement(
          By.css('button[data-target="#remove_company_modal"]')
        )
      )
      .then(btn => btn.click())
      .then(() => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input[name="confirm_name"]',
              value: companyName
            }
          ],
          submit_button_selector: '#remove_company_form button[type="submit"]',
          message: new RegExp(
            `Company ${companyName} and related data were successfully removed`
          )
        })
      )

      .then(() => done())
  })

  it('Ensure that user is logout (by trying to poen general setting page)', function(done) {
    open_page_func({
      url: application_host + 'settings/general/',
      driver
    })
      .then(() => driver.getCurrentUrl())
      .then(url => {
        expect(url).to.include('/login/', 'URL point to Login page')
        done()
      })
  })

  it('Ensure it is not possible to login back', function(done) {
    login_user_func({
      application_host,
      user_email: emailCompanyA,
      driver,
      should_fail: true
    }).then(() => done())
  })

  it('Login as admin of company B', function(done) {
    login_user_func({
      application_host,
      user_email: emailCompanyB,
      driver
    }).then(() => done())
  })

  it('Ensure that admin still has a leave registered', function(done) {
    open_page_func({
      url: application_host + 'requests/',
      driver
    })
      .then(() =>
        driver.findElements(
          By.css('table.user-requests-table td[data-tom-leave-dates="1"]')
        )
      )

      .then(els => {
        expect(
          els.length,
          'Ensure two elements with leave dates were found'
        ).to.be.equal(1)
        return Promise.map(els, el => el.getText())
      })
      .then(dates_str => {
        expect(
          dates_str.sort(),
          'Ensure that date ranges values are as expected'
        ).to.be.deep.equal(['2018-06-07 (morning) 2018-06-07'])
        done()
      })
  })

  it('Ensure that there are still records in Email audit page', function(done) {
    open_page_func({
      url: application_host + 'audit/email/',
      driver
    })
      .then(() =>
        driver.findElements(By.css('tr.vpp-email-audit-entry-header'))
      )
      .then(els => {
        expect(
          els.length,
          'Emsure that we have three email records'
        ).to.be.equal(3)
        done()
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

'use strict'

const test = require('selenium-webdriver/testing')
const By = require('selenium-webdriver').By
const until = require('selenium-webdriver').until
const Promise = require('bluebird')
const expect = require('chai').expect
const registerNewUserFunc = require('../../lib/register_new_user')
const config = require('../../lib/config')
const openPageFunc = require('../../lib/open_page')
const submitFormFunc = require('../../lib/submit_form')
const userInfoFunc = require('../../lib/user_info')
const applicationHost = config.get_application_host()
const companyEditFormId = '#company_edit_form'
const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 * Scenario:
 *
 *  * Create a company
 *  * Ensure that newly added user starts at the very begining
 *  * Ensure user does not have anything carried over from previous year
 *  * Update copany configuration to carry over all unused allowance from previous year
 *  * Recalculate carried over allowance for the company
 *  * Ensure that newly created user's carried over still remains 0
 *
 * */

describe('Carry over issue for users started in current year', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email, userId

  it('Register new company', function(done) {
    registerNewUserFunc({ applicationHost }).then(data => {
      ;({ driver, email } = data)
      done()
    })
  })

  it('Obtain information about admin user', function(done) {
    userInfoFunc({ driver, email }).then(data => {
      userId = data.user.id
      done()
    })
  })

  it('Update admin details to have start date at very beginig of this year', function(done) {
    userStartsAtTheBeginingOfYear({ driver, email }).then(() => done())
  })

  it('Open user details page (abcenses section)', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${userId}/absences/`
    }).then(() => done())
  })

  it('Ensure user does not have anything carried over from previous year', function(done) {
    driver
      .findElement(By.css('#allowanceCarriedOverPart'))
      .then(span => span.getText())
      .then(text => {
        expect(text).to.be.eq('0')
        done()
      })
  })

  it('Update copany configuration to carry over all unused allowance from previous year', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/general/`
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: `${companyEditFormId} select[name="carry_over"]`,
              option_selector: 'option[value="1000"]',
              value: '1000'
            }
          ],
          submit_button_selector: `${companyEditFormId} button[type="submit"]`,
          message: /successfully/i,
          should_be_successful: true
        })
      )
      .then(() => done())
  })

  it('Recalculate carried over allowance for the company', function(done) {
    submitFormFunc({
      driver,
      submit_button_selector:
        '#calculate_carry_over_form button[type="submit"]',
      message: /allowance was successfully carried over/i,
      should_be_successful: true
    }).then(() => done())
  })

  it("Ensure that newly created user's carried over still remains 0", function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${userId}/absences/`
    })
      .then(() => driver.findElement(By.css('#allowanceCarriedOverPart')))
      .then(span => span.getText())
      .then(text => {
        expect(text).to.be.eq('0')
        done()
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

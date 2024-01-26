'use strict'

const By = require('selenium-webdriver').By
const expect = require('chai').expect
const moment = require('moment')
const registerNewUserFunc = require('../../lib/register_new_user')
const checkElementsFunc = require('../../lib/check_elements')
const config = require('../../lib/config')
const openPageFunc = require('../../lib/open_page')
const submitFormFunc = require('../../lib/submit_form')
const userInfoFunc = require('../../lib/user_info')
const applicationHost = config.get_application_host()
const companyEditFormId = '#company_edit_form'
const departmentEditFormId = '#department_edit_form'
const userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 * Scenario:
 *  * Create new company
 *  * Amend its user to started at the very begining of last year
 *  * Add and approve week long leave in last year
 *  * Adjust user's deparment's allowance to be 1 day
 *  * Ensure that company has Carry Over set to be 'None'
 *  * Calculate carry over
 *  * Ensure that newly created user's carried over still remains 0
 *
 * */

describe('No negative allowance is carried overs', function() {
  this.timeout(config.get_execution_timeout())

  let driver, email, user_id

  it('Register new company', function(done) {
    registerNewUserFunc({ applicationHost }).then(data => {
      ;({ driver, email } = data)
      done()
    })
  })

  it('Obtain information about admin user', function(done) {
    userInfoFunc({ driver, email }).then(data => {
      user_id = data.user.id
      done()
    })
  })

  it('Amend its user to started at the very begining of last year', function(done) {
    userStartsAtTheBeginingOfYear({
      driver,
      email,
      overwriteDate: moment
        .utc()
        .add(-1, 'y')
        .startOf('year')
    }).then(() => done())
  })

  it('Update user to have her leaves be auto approved', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${user_id}/`
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input[name="auto_approve"]',
              tick: true,
              value: 'on'
            }
          ],
          submit_button_selector: 'button#save_changes_btn',
          message: /Details for .+ were updated/
        })
      )
      .then(() => done())
  })

  it('Add and approve week long leave in last year', function(done) {
    const lastYear = moment
      .utc()
      .add(-1, 'y')
      .year()

    openPageFunc({ driver, url: applicationHost })
      .then(() => driver.findElement(By.css('#book_time_off_btn')))
      .then(el => el.click())
      .then(el => driver.sleep(1000))
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input#from',
              value: `${lastYear}-06-01`
            },
            {
              selector: 'input#to',
              value: `${lastYear}-06-08`
            }
          ],
          message: /New leave request was added/
        })
      )
      .then(() => done())
  })

  it("Adjust user's deparment's allowance to be 1 day", function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/departments/`
    })
      .then(() =>
        driver.findElements(By.css('a[href*="/settings/departments/edit/"]'))
      )
      .then(links => links[0].click())
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: `${departmentEditFormId} select[name="allowance"]`,
              option_selector: 'option[value="1"]',
              value: '1'
            }
          ],
          submit_button_selector: `${departmentEditFormId} button[type="submit"]`,
          message: /Department .* was updated/,
          should_be_successful: true
        })
      )
      .then(() => done())
  })

  it('Ensure that nominal allowance was reduced to 1', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${user_id}/absences/`
    })
      .then(() => driver.findElement(By.css('#nominalAllowancePart')))
      .then(el => el.getText())
      .then(text => {
        expect(text).to.be.eq('1')
        done()
      })
  })

  it('Ensure that company has Carry Over set to be "None"', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/general/`
    })
      .then(() =>
        checkElementsFunc({
          driver,
          elements_to_check: [
            {
              selector: `${companyEditFormId} select[name="carry_over"]`,
              value: '0'
            }
          ]
        })
      )
      .then(() => done())
  })

  it('Calculate carry over', function(done) {
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
      url: `${applicationHost}users/edit/${user_id}/absences/`
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

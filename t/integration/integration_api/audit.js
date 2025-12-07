'use strict'

const test = require('selenium-webdriver/testing')
const By = require('selenium-webdriver').By
const expect = require('chai').expect
const Promise = require('bluebird')
const rp = require('request-promise')
const registerNewUserFunc = require('../../lib/register_new_user')
const openPageFunc = require('../../lib/open_page')
const submitFormFunc = require('../../lib/submit_form')
const userInfoFunc = require('../../lib/user_info')
const checkElementsFunc = require('../../lib/check_elements')
const addNewUserFunc = require('../../lib/add_new_user')
const config = require('../../lib/config')
const applicationHost = config.get_application_host()

/*
 * Scenario:
 *
 *   * Create new company
 *   * Enable API integration
 *   * Navigate to current user details and update its Name and Surname
 *   * Add second user
 *   * Remove second user
 *   * Fetch the Audit feed from integration API and ensure that
 *     users details manipulations were captured
 *
 * */

describe('Basic audit for user changes', function() {
  this.timeout(config.get_execution_timeout())

  let driver, token, email, userId, secondEmail, secondUserId

  it('Create new company', function(done) {
    registerNewUserFunc({ applicationHost })
      .then(data => {
        ;({ driver, email } = data)
        return userInfoFunc({ driver, email })
      })
      .then(data => (userId = data.user.id))
      .then(() => done())
  })

  it('Enable API integration and capture the token value', function(done) {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/company/integration-api/`
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input[name="integration_api_enabled"]',
              tick: true,
              value: 'on'
            }
          ],
          submit_button_selector: '#save_settings_btn',
          should_be_successful: true,
          message: /Settings were saved/
        })
      )
      .then(() => driver.findElement(By.css('input#token-value')))
      .then(el => el.getAttribute('value'))
      .then(v => Promise.resolve((token = v)))
      .then(obj => done())
  })

  it('Navigate to current user details and update its Name and Surname', function(done) {
    openPageFunc({
      url: `${applicationHost}users/edit/${userId}/`,
      driver
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input[name="name"]',
              value: 'NewAuditName'
            },
            {
              selector: 'input[name="lastname"]',
              value: 'NewAuditLastName'
            }
          ],
          submit_button_selector: 'button#save_changes_btn',
          message: /Details for .* were updated/
        })
      )
      .then(() => done())
  })

  it('Create second user', function(done) {
    addNewUserFunc({
      application_host: applicationHost,
      driver
    })
      .then(data => {
        secondEmail = data.new_user_email
        return userInfoFunc({ driver, email: secondEmail })
      })
      .then(data => (secondUserId = data.user.id))
      .then(() => done())
  })

  it('Remove second account', function(done) {
    openPageFunc({
      url: `${applicationHost}users/edit/${secondUserId}/`,
      driver
    })
      .then(() =>
        submitFormFunc({
          submit_button_selector: 'button#remove_btn',
          message: /Employee records were removed from the system/,
          driver,
          confirm_dialog: true
        })
      )
      .then(() => done())
  })

  it('Fetch the Audit feed from integration API', function(done) {
    rp(`${applicationHost}integration/v1/audit`, {
      method: 'GET',
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => JSON.parse(res))
      .then(obj => {
        const twoEvents = obj
          .filter(i => i.entity_type === 'USER')
          .filter(i => i.entity_id === userId)

        expect(twoEvents.length).to.be.eql(2)

        expect(twoEvents.map(i => i.attribute).join(',')).to.be.eql(
          'name,lastname'
        )
        expect(twoEvents.map(i => i.newValue).join(',')).to.be.eql(
          'NewAuditName,NewAuditLastName'
        )

        const removedEvents = obj
          .filter(i => i.entity_type === 'USER')
          .filter(i => i.entity_id === secondUserId)

        expect(
          removedEvents.length,
          'There records regarding user deletion'
        ).to.be.above(0)
        expect(
          removedEvents.filter(i => i.newValue === 'null').length,
          'all of them are nulls'
        ).to.be.eql(removedEvents.length)

        done()
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

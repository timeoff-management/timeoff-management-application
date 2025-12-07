'use strict'

const By = require('selenium-webdriver').By
const Promise = require('bluebird')
const register_new_user_func = require('../t/lib/register_new_user')
const login_user_func = require('../t/lib/login_with_user')
const logout_user_func = require('../t/lib/logout_user')
const open_page_func = require('../t/lib/open_page')
const config = require('../t/lib/config')
const application_host = config.get_application_host()

/*
 *  THis is simple scrip to execute on different versions of application
 *  to check if new version introduces any anomalies.
 *
 *  Example of running:
 *
 *    node node_modules/mocha/bin/mocha --recursive bin/fetch_user_stat.js
 *
 * */

describe('Collect remaining days for employees', function() {
  this.timeout(config.get_execution_timeout())

  const report = {}
  let driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it('Logout', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  // This is a list of accountes to iterate through
  // By default it is dummy ones
  const users = ['test@test.com', 'test2@test.com']

  for (const email of users) {
    it('Login as user', function(done) {
      login_user_func({
        application_host,
        user_email: email,
        driver
      }).then(function() {
        done()
      })
    })

    it('Open users page', function(done) {
      open_page_func({
        url: application_host + 'users/',
        driver
      }).then(function() {
        done()
      })
    })

    it('Fetch remaining days for each employee', function(done) {
      driver
        .findElements(By.css('tr[data-vpp-user-row]'))

        .then(els =>
          Promise.map(
            els,
            el => {
              let user_id

              return el
                .getAttribute('data-vpp-user-row')
                .then(u_id => Promise.resolve((user_id = u_id)))
                .then(() => el.findElement(By.css('td.vpp-days-remaining')))
                .then(el => el.getText())
                .then(days => Promise.resolve((report[user_id] = days)))
            },
            { concurrency: 0 }
          )
        )

        .then(() => done())
    })

    it('Logout user', function(done) {
      logout_user_func({
        application_host,
        driver
      }).then(function() {
        done()
      })
    })
  }

  after(function(done) {
    console.dir(report)
    driver.quit().then(function() {
      done()
    })
  })
})

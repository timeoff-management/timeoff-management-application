"use strict"

var test = require("selenium-webdriver/testing"),
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  _ = require("underscore"),
  Promise = require("bluebird"),
  until = require("selenium-webdriver").until,
  login_user_func = require("../../lib/login_with_user"),
  register_new_user_func = require("../../lib/register_new_user"),
  logout_user_func = require("../../lib/logout_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  check_elements_func = require("../../lib/check_elements"),
  check_booking_func = require("../../lib/check_booking_on_calendar"),
  add_new_user_func = require("../../lib/add_new_user")

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user that has more days that allowance
 *    - Make sure that system complains about lack of allowance
 *
 * */

describe("Try to book more holidays then in allowance", function() {
  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, new_user_email, driver

  it("Create new company", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      new_user_email = data.email
      driver = data.driver
      done()
    })
  })

  it("Create new non-admin user", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      non_admin_user_email = data.new_user_email
      done()
    })
  })

  it("Logout from admin account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Login as non-admin user", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: non_admin_user_email,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Open calendar page", function(done) {
    open_page_func({
      url: application_host + "calendar/?year=2015&show_full_year=1",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("And make sure that it is calendar indeed", function(done) {
    driver.getTitle().then(function(title) {
      expect(title).to.be.equal("Calendar")
      done()
    })
  })

  it("Request new leave", function(done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
      .then(function(el) {
        return el.click()
      })

      // Following code is to ensure that non admin user can request leave only for
      // herself
      .then(function() {
        return driver
          .isElementPresent(By.css("select#employee"))
          .then(function(is_present) {
            expect(is_present).to.be.equal(false)
          })
      })

      // Create new leave request
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver: driver,
          // The order matters here as we need to populate dropdown prior date filds
          form_params: [
            {
              selector: 'select[name="from_date_part"]',
              option_selector: 'option[value="2"]',
              value: "2"
            },
            {
              selector: "input#from",
              value: "2016-06-15"
            },
            {
              selector: "input#to",
              value: "2016-07-16"
            }
          ],
          should_be_successful: false,
          message: /Failed to create a leave request/
        }).then(function() {
          done()
        })
      })
  })

  it("Check that correct warning messages are shown", function(done) {
    driver.findElements(By.css("div.alert")).then(function(els) {
      Promise.all(
        _.map(els, function(el) {
          return el.getText()
        })
      ).then(function(texts) {
        expect(
          _.any(texts, function(text) {
            return /Requested absence is longer than remaining allowance/.test(
              text
            )
          })
        ).to.be.equal(true)

        done()
      })
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

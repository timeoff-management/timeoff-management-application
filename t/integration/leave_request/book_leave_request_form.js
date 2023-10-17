"use strict"

var test = require("selenium-webdriver/testing"),
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  _ = require("underscore"),
  Promise = require("bluebird"),
  moment = require("moment"),
  until = require("selenium-webdriver").until,
  login_user_func = require("../../lib/login_with_user"),
  register_new_user_func = require("../../lib/register_new_user"),
  logout_user_func = require("../../lib/logout_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  check_elements_func = require("../../lib/check_elements"),
  check_booking_func = require("../../lib/check_booking_on_calendar"),
  add_new_user_func = require("../../lib/add_new_user")

describe("Check the client side logic to facilitate filling new absence form", function() {
  this.timeout(config.get_execution_timeout())

  var driver

  it("Register new company", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it("Open calendar page", function(done) {
    open_page_func({
      url: application_host + "calendar/?year=2017&show_full_year=1",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Open Book new leave pop up window", function(done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
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

  it("Ensure by default FROM and TO fields are populated with current date", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: "input.book-leave-from-input",
          value: moment().format("YYYY-MM-DD")
        },
        {
          selector: "input.book-leave-to-input",
          value: moment().format("YYYY-MM-DD")
        }
      ]
    }).then(function() {
      done()
    })
  })

  it("Update FROM to be in future and make sure TO is automatically addusted to the same date", function(done) {
    var inp_from,
      tomorrow_str = moment()
        .add(1, "days")
        .format("YYYY-MM-DD")

    driver
      .findElement(By.css("input.book-leave-from-input"))
      .then(function(el) {
        inp_from = el
        return el.clear()
      })
      .then(function() {
        return inp_from.sendKeys(tomorrow_str)
      })

    driver.call(function() {
      check_elements_func({
        driver: driver,
        elements_to_check: [
          {
            selector: "input.book-leave-from-input",
            value: tomorrow_str
          },
          {
            selector: "input.book-leave-to-input",
            value: tomorrow_str
          }
        ]
      }).then(function() {
        done()
      })
    })
  })

  it("Update FROM to be in past and make sure TO is stays unchanged", function(done) {
    var inp_from,
      tomorrow_str = moment()
        .add(1, "days")
        .format("YYYY-MM-DD"),
      yesterday_str = moment()
        .subtract(1, "days")
        .format("YYYY-MM-DD")

    driver
      .findElement(By.css("input.book-leave-from-input"))
      .then(function(el) {
        inp_from = el
        return el.clear()
      })
      .then(function() {
        return inp_from.sendKeys(yesterday_str)
      })

    driver.call(function() {
      check_elements_func({
        driver: driver,
        elements_to_check: [
          {
            selector: "input.book-leave-from-input",
            value: yesterday_str
          },
          {
            selector: "input.book-leave-to-input",
            value: tomorrow_str
          }
        ]
      }).then(function() {
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

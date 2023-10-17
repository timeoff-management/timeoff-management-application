"use strict"

var test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  _ = require("underscore"),
  Promise = require("bluebird"),
  register_new_user_func = require("../lib/register_new_user"),
  login_user_func = require("../lib/login_with_user"),
  open_page_func = require("../lib/open_page"),
  submit_form_func = require("../lib/submit_form"),
  add_new_user_func = require("../lib/add_new_user"),
  config = require("../lib/config"),
  application_host = config.get_application_host()

describe("Try to use non defaul date formats for editing employee details", function() {
  this.timeout(config.get_execution_timeout())

  var driver

  it("Register new company with default date to be DD/MM/YY", function(done) {
    register_new_user_func({
      application_host: application_host,
      default_date_format: "DD/MM/YY"
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it("Open employee list page", function(done) {
    open_page_func({
      url: application_host + "users/",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Open employee details page", function(done) {
    driver
      .findElement(By.css("td.user-link-cell a"))
      .then(function(element) {
        return element.click()
      })
      .then(function() {
        done()
      })
  })

  it("Update Start date to be date that was reportedly problematic", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: "input#start_date_inp",
          value: "22/08/17"
        }
      ],
      submit_button_selector: "button#save_changes_btn",
      message: /Details for .* were updated/
      //      should_be_successful : true,
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

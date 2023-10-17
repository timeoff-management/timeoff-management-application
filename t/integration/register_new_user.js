"use strict"

var test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  register_new_user_func = require("../lib/register_new_user"),
  expect = require("chai").expect,
  login_user_func = require("../lib/login_with_user"),
  open_page_func = require("../lib/open_page"),
  submit_form_func = require("../lib/submit_form"),
  config = require("../lib/config"),
  moment = require("moment"),
  application_host = config.get_application_host()

describe("Register new user", function() {
  var driver

  this.timeout(config.get_execution_timeout())

  it("Performing registration process", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it("Navigate to current uer details", done => {
    open_page_func({
      url: application_host + "users/",
      driver: driver
    })
      .then(() => driver.findElement(By.css("td.user-link-cell a")))
      .then(element => element.click())
      .then(() => done())
  })

  it("Update start date to be mid-year", done => {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: "input#start_date_inp",
          value: moment.utc().year() + "-06-01"
        }
      ],
      submit_button_selector: "button#save_changes_btn",
      message: /Details for .* were updated/
    }).then(() => done())
  })

  it("Go back to Calendar page and ensure that available and total days are same and are 12", done => {
    open_page_func({
      url: application_host + "calendar/",
      driver: driver
    })
      .then(() =>
        driver.findElement(By.css("[data-tom-days-available-in-allowance]"))
      )
      .then(element => element.getText())
      .then(days => {
        expect(
          days,
          "Ensure that reported days available in allowance is correct"
        ).to.be.equal("12")
        return driver.findElement(By.css("[data-tom-total-days-in-allowance]"))
      })
      .then(element => element.getText())
      .then(days => {
        expect(
          days,
          "Ensure that reported total days in allowance is correct"
        ).to.be.equal("12")
        done()
      })
  })

  it("Navigate to current uer details", done => {
    open_page_func({
      url: application_host + "users/",
      driver: driver
    })
      .then(() => driver.findElement(By.css("td.user-link-cell a")))
      .then(element => element.click())
      .then(() => done())
  })

  it("Update start date to be start of the year", done => {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: "input#start_date_inp",
          value: moment.utc().year() + "-01-01"
        }
      ],
      submit_button_selector: "button#save_changes_btn",
      message: /Details for .* were updated/
    }).then(() => done())
  })

  it("Go back to Calendar page and ensure that available and total days are same and are 20", done => {
    open_page_func({
      url: application_host + "calendar/",
      driver: driver
    })
      .then(() =>
        driver.findElement(By.css("[data-tom-days-available-in-allowance]"))
      )
      .then(element => element.getText())
      .then(days => {
        expect(
          days,
          "Ensure that reported days available in allowance is correct"
        ).to.be.equal("20")
        return driver.findElement(By.css("[data-tom-total-days-in-allowance]"))
      })
      .then(element => element.getText())
      .then(days => {
        expect(
          days,
          "Ensure that reported total days in allowance is correct"
        ).to.be.equal("20")
        done()
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

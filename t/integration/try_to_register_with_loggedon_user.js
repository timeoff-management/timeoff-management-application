"use strict"

var test = require("selenium-webdriver/testing"),
  config = require("../lib/config"),
  application_host = config.get_application_host(),
  expect = require("chai").expect,
  Promise = require("bluebird"),
  register_new_user_func = require("../lib/register_new_user"),
  open_page_func = require("../lib/open_page")

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * try to openregister page
    ** system showl redirect to page

*/

describe("Try to open registeration page with active user in a session", function() {
  this.timeout(config.get_execution_timeout())

  var admin_email, driver

  it("Create new company", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it("Try to open Registration page", function(done) {
    open_page_func({
      url: application_host + "register/",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Make sure that user is landed on calendar page", function(done) {
    driver.getCurrentUrl().then(function(url) {
      expect(url).to.be.equal(application_host + "calendar/")
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

"use strict";

var test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../lib/register_new_user"),
  login_user_func = require("../lib/login_with_user"),
  add_new_user_func = require("../lib/add_new_user"),
  config = require("../lib/config"),
  application_host = config.get_application_host();

/*
 *  Scenario to check in this test:
 *
 *  * Create an account and get a note of email
 *  * Try to add user with the same email
 *
 * */

describe("Admin tries to add user with email used for other one", function () {
  this.timeout(config.get_execution_timeout());

  var new_user_email, driver;

  it("Create new company", function (done) {
    register_new_user_func({
      application_host: application_host,
    }).then(function (data) {
      driver = data.driver;
      new_user_email = data.email;
      done();
    });
  });

  it("Create new non-admin user", function (done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver,
      email: new_user_email,
      error_message: "Email is already in use",
    }).then(function () {
      done();
    });
  });

  after(function (done) {
    driver.quit().then(function () {
      done();
    });
  });
});

"use strict";

var test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  _ = require("underscore"),
  Promise = require("bluebird"),
  login_user_func = require("../lib/login_with_user"),
  register_new_user_func = require("../lib/register_new_user"),
  logout_user_func = require("../lib/logout_user"),
  config = require("../lib/config"),
  application_host = config.get_application_host();

/*
  User emails are case insensitive.

  Scenario to check:
    * create new account with email containing capital letters
    * logout
    * try to login with same email typed in lower case letters

*/

describe("Emails are case insensitive", function() {
  this.timeout(config.get_execution_timeout());

  var admin_email, driver;

  it("Register an account useing upper case letters", function(done) {
    register_new_user_func({
      application_host: application_host,
      user_email: new Date().getTime() + "John.Smith@TEST.com"
    }).then(function(data) {
      admin_email = data.email;
      driver = data.driver;
      done();
    });
  });

  it("Logount from current session", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login with lower case email", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: admin_email.toLowerCase(),
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Logout", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Try to login with upper case email", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: admin_email.toUpperCase(),
      driver: driver
    }).then(function() {
      done();
    });
  });

  after(function(done) {
    driver.quit().then(function() {
      done();
    });
  });
});

"use strict";

const test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../../lib/register_new_user"),
  login_user_func = require("../../lib/login_with_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  company_edit_form_id = "#company_edit_form";

describe("Edit company details", function () {
  var driver;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function (done) {
    register_new_user_func({
      application_host: application_host,
    }).then(function (data) {
      driver = data.driver;
      done();
    });
  });

  it("Open page for editing company details", function (done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver,
    }).then(function () {
      done();
    });
  });

  it("Check that company is been updated if valid values are submitted", function (done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: company_edit_form_id + ' input[name="name"]',
          value: "Test companu ltd",
        },
        {
          selector: company_edit_form_id + ' select[name="country"]',
          option_selector: 'option[value="US"]',
          value: "US",
        },
      ],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
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

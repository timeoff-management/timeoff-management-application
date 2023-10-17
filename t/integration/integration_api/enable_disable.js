"use strict";

const test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  Promise = require("bluebird"),
  rp = require("request-promise"),
  registerNewUserFunc = require("../../lib/register_new_user"),
  openPageFunc = require("../../lib/open_page"),
  submitFormFunc = require("../../lib/submit_form"),
  checkElementsFunc = require("../../lib/check_elements"),
  config = require("../../lib/config"),
  applicationHost = config.get_application_host();

/*
 *  Scenario to go in this test:
 *    * Create new company
 *    * Navigate to API page and ensure the API is disable
 *    * Read the key and try to invoke the API with that key: ensure the end point
 *      is blocked
 *    * Enable the API and repeate the invokation above: ensure that now it is
 *      successful
 *    * Regenerate the API key
 *    * Ensure that old API key is not valid anymore
 *    * Ensure that newly renenerated API key works fine
 *    * Disable the API integration for current company
 *    * Ensure that API end points do not work anymore
 *
 * */

describe("Enable/disable Integration APIs", function () {
  this.timeout(config.get_execution_timeout());

  let driver, oldToken, newToken, email;

  it("Create new company", (done) => {
    registerNewUserFunc({ applicationHost }).then((data) => {
      ({ driver, email } = data);
      done();
    });
  });

  it("Navigate to API page and ensure the API is disable", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/company/integration-api/`,
    })
      .then(() =>
        checkElementsFunc({
          driver,
          elements_to_check: [
            {
              selector: 'input[name="integration_api_enabled"]',
              tick: true,
              value: "off",
            },
          ],
        })
      )
      .then(() => done());
  });

  it("Read the key and try to invoke the API with that key: ensure the end point is blocked", (done) => {
    driver
      .findElement(By.css("input#token-value"))
      .then((el) => el.getAttribute("value"))
      .then((v) => Promise.resolve((oldToken = v)))
      .then(() =>
        rp(`${applicationHost}integration/v1/report/absence`, {
          method: "GET",
          body: "{}",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${oldToken}`,
          },
        })
      )
      .then((res) => {
        throw new Error("TOM_TEST");
      })
      .catch((error) => {
        expect(error).not.to.be.equal(
          "TOM_TEST",
          'Ensure contrl flow did not go beyond the "rp"'
        );
        expect(error.response.statusCode).to.be.equal(
          401,
          "Ensure response code is correct"
        );
        done();
      });
  });

  it("Enable the API and repeate the invokation above: ensure that now it is successful", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/company/integration-api/`,
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input[name="integration_api_enabled"]',
              tick: true,
              value: "on",
            },
          ],
          submit_button_selector: "#save_settings_btn",
          should_be_successful: true,
          message: /Settings were saved/,
        })
      )
      .then(() =>
        rp(`${applicationHost}integration/v1/report/absence`, {
          method: "GET",
          body: "{}",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${oldToken}`,
          },
        })
      )
      .then((res) => JSON.parse(res))
      .then((obj) => {
        expect(obj[0].user.email).to.be.equal(
          email,
          "Ensure that report conatins email of admin user"
        );
        done();
      });
  });

  it("Regenerate the API key", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/company/integration-api/`,
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [],
          submit_button_selector: "#regenerate_token_btn",
          should_be_successful: true,
          message: /Settings were saved/,
        })
      )
      .then(() => driver.findElement(By.css("input#token-value")))
      .then((el) => el.getAttribute("value"))
      .then((v) => Promise.resolve((newToken = v)))
      .then(() => done());
  });

  it("Ensure that old API key is not valid anymore", (done) => {
    rp(`${applicationHost}integration/v1/report/absence`, {
      method: "GET",
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oldToken}`,
      },
    })
      .then((res) => {
        throw new Error("TOM_TEST");
      })
      .catch((error) => {
        expect(error).not.to.be.equal(
          "TOM_TEST",
          'Ensure contrl flow did not go beyond the "rp"'
        );
        expect(error.response.statusCode).to.be.equal(
          401,
          "Ensure response code is correct"
        );
        done();
      });
  });

  it("Ensure that newly renenerated API key works fine", (done) => {
    rp(`${applicationHost}integration/v1/report/absence`, {
      method: "GET",
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
    })
      .then((res) => JSON.parse(res))
      .then((obj) => {
        expect(obj[0].user.email).to.be.equal(
          email,
          "Ensure that report conatins email of admin user"
        );
        done();
      });
  });

  it("Disable the API integration for current company", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/company/integration-api/`,
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: 'input[name="integration_api_enabled"]',
              tick: true,
              value: "off",
            },
          ],
          submit_button_selector: "#save_settings_btn",
          should_be_successful: true,
          message: /Settings were saved/,
        })
      )
      .then(() => done());
  });

  it("Ensure that API end points do not work anymore", (done) => {
    rp(`${applicationHost}integration/v1/report/absence`, {
      method: "GET",
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
    })
      .then((res) => {
        throw new Error("TOM_TEST");
      })
      .catch((error) => {
        expect(error).not.to.be.equal(
          "TOM_TEST",
          'Ensure contrl flow did not go beyond the "rp"'
        );
        expect(error.response.statusCode).to.be.equal(
          401,
          "Ensure response code is correct"
        );
        done();
      });
  });

  after(function (done) {
    driver.quit().then(() => done());
  });
});

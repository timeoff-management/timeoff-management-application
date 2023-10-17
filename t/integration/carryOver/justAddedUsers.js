"use strict";

const test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  until = require("selenium-webdriver").until,
  Promise = require("bluebird"),
  expect = require("chai").expect,
  registerNewUserFunc = require("../../lib/register_new_user"),
  config = require("../../lib/config"),
  openPageFunc = require("../../lib/open_page"),
  submitFormFunc = require("../../lib/submit_form"),
  userInfoFunc = require("../../lib/user_info"),
  applicationHost = config.get_application_host(),
  companyEditFormId = "#company_edit_form",
  userStartsAtTheBeginingOfYear = require("../../lib/set_user_to_start_at_the_beginning_of_the_year");

/*
 * Scenario:
 *
 *  * Create a company
 *  * Ensure that newly added user starts at the very begining
 *  * Ensure user does not have anything carried over from previous year
 *  * Update copany configuration to carry over all unused allowance from previous year
 *  * Recalculate carried over allowance for the company
 *  * Ensure that newly created user's carried over still remains 0
 *
 * */

describe("Carry over issue for users started in current year", function () {
  this.timeout(config.get_execution_timeout());

  let driver, email, userId;

  it("Register new company", (done) => {
    registerNewUserFunc({ applicationHost }).then((data) => {
      ({ driver, email } = data);
      done();
    });
  });

  it("Obtain information about admin user", (done) => {
    userInfoFunc({ driver, email }).then((data) => {
      userId = data.user.id;
      done();
    });
  });

  it("Update admin details to have start date at very beginig of this year", (done) => {
    userStartsAtTheBeginingOfYear({ driver, email }).then(() => done());
  });

  it("Open user details page (abcenses section)", function (done) {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${userId}/absences/`,
    }).then(() => done());
  });

  it("Ensure user does not have anything carried over from previous year", (done) => {
    driver
      .findElement(By.css("#allowanceCarriedOverPart"))
      .then((span) => span.getText())
      .then((text) => {
        expect(text).to.be.eq("0");
        done();
      });
  });

  it("Update copany configuration to carry over all unused allowance from previous year", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}settings/general/`,
    })
      .then(() =>
        submitFormFunc({
          driver,
          form_params: [
            {
              selector: `${companyEditFormId} select[name="carry_over"]`,
              option_selector: 'option[value="1000"]',
              value: "1000",
            },
          ],
          submit_button_selector: `${companyEditFormId} button[type="submit"]`,
          message: /successfully/i,
          should_be_successful: true,
        })
      )
      .then(() => done());
  });

  it("Recalculate carried over allowance for the company", (done) => {
    submitFormFunc({
      driver,
      submit_button_selector:
        '#calculate_carry_over_form button[type="submit"]',
      message: /allowance was successfully carried over/i,
      should_be_successful: true,
    }).then(() => done());
  });

  it("Ensure that newly created user's carried over still remains 0", (done) => {
    openPageFunc({
      driver,
      url: `${applicationHost}users/edit/${userId}/absences/`,
    })
      .then(() => driver.findElement(By.css("#allowanceCarriedOverPart")))
      .then((span) => span.getText())
      .then((text) => {
        expect(text).to.be.eq("0");
        done();
      });
  });

  after((done) => {
    driver.quit().then(() => done());
  });
});

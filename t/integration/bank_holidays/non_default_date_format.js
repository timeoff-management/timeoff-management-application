"use strict";

var test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../../lib/register_new_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  expect = require("chai").expect,
  By = require("selenium-webdriver").By,
  Promise = require("bluebird"),
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  bankholiday_form_id = "#update_bankholiday_form",
  new_bankholiday_form_id = "#add_new_bank_holiday_form",
  company_edit_form_id = "#company_edit_form";

/*
 * This is a regressiopn for https://github.com/timeoff-management/application/issues/103
 *
 * The scenario:
 *
 *  * create new company with non-default date format
 *  * ensure that there are no bank holidays for the account
 *  * add thee bank holidays on 1 Jan, 2, Jan and 1 May
 *  * edit labels for newly added holidays
 *  * and make sure that dates were not changes as part of the update
 *
 * */

describe("Try to manage Bank holidays with non-default date format", function() {
  this.timeout(config.get_execution_timeout());

  var driver;

  it("Register new company and ensure it has non-default date format", function(done) {
    register_new_user_func({
      application_host: application_host,
      default_date_format: "DD/MM/YYYY"
    }).then(function(data) {
      driver = data.driver;
      done();
    });
  });

  it("Open page with bank holidays", function(done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Remove default predefined bank holidays", function(done) {
    submit_form_func({
      driver: driver,
      message: /Bank holiday was successfully removed/,
      submit_button_selector: bankholiday_form_id + ' button[value="0"]'
    }).then(function() {
      done();
    });
  });

  it("And make sure that no bank holidays are shown", function(done) {
    driver
      .findElement(By.css("div.tst-no-bank-holidays"))
      .then(function(el) {
        return el.getText();
      })
      .then(function(txt) {
        expect(txt).to.exist;
        done();
      });
  });

  it("Add New year", function(done) {
    driver
      .findElement(By.css("#add_new_bank_holiday_btn"))
      .then(function(el) {
        return el.click();
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: new_bankholiday_form_id + ' input[name="name__new"]',
              value: "New Year"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "01/01/2015"
            }
          ],
          submit_button_selector:
            new_bankholiday_form_id + ' button[type="submit"]',
          message: /Changes to bank holidays were saved/
        }).then(function() {
          done();
        });
      });
  });

  it("Add Second day of New year", function(done) {
    driver
      .findElement(By.css("#add_new_bank_holiday_btn"))
      .then(function(el) {
        return el.click();
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: new_bankholiday_form_id + ' input[name="name__new"]',
              value: "Second day of New Year"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "02/01/2015"
            }
          ],
          submit_button_selector:
            new_bankholiday_form_id + ' button[type="submit"]',
          message: /Changes to bank holidays were saved/
        }).then(function() {
          done();
        });
      });
  });

  it("Add Add Labour day", function(done) {
    driver
      .findElement(By.css("#add_new_bank_holiday_btn"))
      .then(function(el) {
        return el.click();
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: new_bankholiday_form_id + ' input[name="name__new"]',
              value: "Labour day"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "01/05/2015"
            }
          ],
          submit_button_selector:
            new_bankholiday_form_id + ' button[type="submit"]',
          message: /Changes to bank holidays were saved/
        }).then(function() {
          done();
        });
      });
  });

  it("Rename Christmas to have proper name", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: bankholiday_form_id + ' input[name="name__0"]',
          value: "NOTHING"
        },
        {
          selector: bankholiday_form_id + ' input[name="name__1"]',
          value: "NOTHING"
        },
        {
          selector: bankholiday_form_id + ' input[name="name__2"]',
          value: "NOTHING"
        }
      ],
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "01/01/2015"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__1"]',
          value: "02/01/2015"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__2"]',
          value: "01/05/2015"
        }
      ],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
      should_be_successful: true
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

describe("Try to use DD/MM/YY and some missleading date", function() {
  this.timeout(config.get_execution_timeout());

  var driver;

  it("Register new company with default date to be DD/MM/YY", function(done) {
    register_new_user_func({
      application_host: application_host,
      default_date_format: "DD/MM/YY"
    }).then(function(data) {
      driver = data.driver;
      done();
    });
  });

  it("Open general settings page", function(done) {
    driver.call(function() {
      open_page_func({
        url: application_host + "settings/general/",
        driver: driver
      }).then(function() {
        done();
      });
    });
  });

  it("Try to add new bank holiday with date that was reported to be problematic", function(done) {
    driver
      .findElement(By.css("#add_new_bank_holiday_btn"))
      .then(function(el) {
        return el.click();
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        return submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: new_bankholiday_form_id + ' input[name="name__new"]',
              value: "Problematic date"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "22/08/17"
            }
          ],
          submit_button_selector:
            new_bankholiday_form_id + ' button[type="submit"]',
          message: /Changes to bank holidays were saved/
        });
      })
      .then(function() {
        done();
      });
  });

  after(function(done) {
    driver.quit().then(function() {
      done();
    });
  });
});

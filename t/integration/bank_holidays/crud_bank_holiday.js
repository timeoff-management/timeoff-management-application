"use strict";

var test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../../lib/register_new_user"),
  login_user_func = require("../../lib/login_with_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  check_elements_func = require("../../lib/check_elements"),
  moment = require("moment"),
  By = require("selenium-webdriver").By,
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  bankholiday_form_id = "#update_bankholiday_form",
  new_bankholiday_form_id = "#add_new_bank_holiday_form",
  new_user_email;

describe("CRUD for bank holidays", function() {
  var driver;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      new_user_email = data.email;
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

  it("Check if there are default bank holidays", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="name__0"]',
          value: "Early May bank holiday"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "2015-05-04"
        }
      ]
    }).then(function() {
      done();
    });
  });

  it("Try to submit form with incorrect date", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "crap"
        }
      ],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/
    }).then(function() {
      done();
    });
  });

  it("Check that after some crappy input was provided into the date, it falls back to the current date", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="name__0"]',
          value: "Early May bank holiday"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: moment().format("YYYY-MM-DD")
        }
      ]
    }).then(function() {
      done();
    });
  });

  it("Update Early spring holiday to be 4th of May", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "2015-05-04"
        }
      ],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/
    }).then(function() {
      done();
    });
  });

  it("Add new bank holiday to be in the beginning of the list", function(done) {
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
              value: "Z New Year"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "2015-01-01"
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

  it("Add new bank holiday to be in the end of the list", function(done) {
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
              value: "Xmas"
            },
            {
              selector: new_bankholiday_form_id + ' input[name="date__new"]',
              value: "2015-12-25"
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

  it("Check that the order of all three holidays is based on dates rather than names", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="name__0"]',
          value: "Z New Year"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "2015-01-01"
        },
        {
          selector: bankholiday_form_id + ' input[name="name__1"]',
          value: "Early May bank holiday"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__1"]',
          value: "2015-05-04"
        },
        {
          selector: bankholiday_form_id + ' input[name="name__2"]',
          value: "Xmas"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__2"]',
          value: "2015-12-25"
        }
      ]
    }).then(function() {
      done();
    });
  });

  it("Rename Christmas to have proper name", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: bankholiday_form_id + ' input[name="name__1"]',
          value: "Christmas"
        }
      ],
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="name__1"]',
          value: "Christmas"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__1"]',
          value: "2015-12-25"
        }
      ],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/
    }).then(function() {
      done();
    });
  });

  it("Remove Spring bank holiday", function(done) {
    submit_form_func({
      driver: driver,
      elements_to_check: [
        {
          selector: bankholiday_form_id + ' input[name="name__0"]',
          value: "Z New Year"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__0"]',
          value: "2015-01-01"
        },
        {
          selector: bankholiday_form_id + ' input[name="name__2"]',
          value: "Christmas"
        },
        {
          selector: bankholiday_form_id + ' input[name="date__2"]',
          value: "2015-12-25"
        }
      ],
      submit_button_selector: bankholiday_form_id + ' button[value="1"]',
      message: /Bank holiday was successfully removed/
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

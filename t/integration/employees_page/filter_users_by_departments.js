"use strict";

var test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  Promise = require("bluebird"),
  until = require("selenium-webdriver").until,
  register_new_user_func = require("../../lib/register_new_user"),
  login_user_func = require("../../lib/login_with_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  check_elements_func = require("../../lib/check_elements"),
  add_new_user_func = require("../../lib/add_new_user"),
  By = require("selenium-webdriver").By,
  new_department_form_id = "#add_new_department_form",
  config = require("../../lib/config"),
  application_host = config.get_application_host();

/*
 *  Scenario to check that filtering by department feature on users page.
 *
 *    * register new company with admin user;
 *    * create new departmen: "IT"
 *    * create new user, place it into newly created department
 *    * open "users" page and make sure there are both there
 *    * click "Sales" department link and make sure that only admin user is presented
 *    * click "IT" department and make sure only second user is visible
 *    * click "All" and make sure that both users are presented
 *
 * */

describe('Check filtering on "users" page', function() {
  var driver;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver;
      done();
    });
  });

  it('Create new department "IT": open page', function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("... and submit the form", function(done) {
    driver
      .findElement(By.css("#add_new_department_btn"))
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
              selector: new_department_form_id + ' input[name="name__new"]',
              value: "IT"
            },
            {
              selector:
                new_department_form_id + ' select[name="allowance__new"]',
              option_selector: 'option[value="10"]',
              value: "10"
            }
          ],
          submit_button_selector:
            new_department_form_id + ' button[type="submit"]',
          message: /Changes to departments were saved/
        }).then(function() {
          done();
        });
      });
  });

  it("Create new non-admin user", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver,
      // We know that departments are ordered alphabetically, so newly
      // added "ID" is before default "Sales" one
      department_index: "0"
    }).then(function() {
      done();
    });
  });

  it("Open 'users' page", function(done) {
    open_page_func({
      url: application_host + "users/",
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Make sure that both users are shown", function(done) {
    driver.findElements(By.css("td.user_department")).then(function(elements) {
      expect(elements.length).to.be.equal(2);
      done();
    });
  });

  it("Click on IT department", function(done) {
    driver
      // Departments are ordered by names so we are sure that first item
      // after general link "All" is going to be "IT"
      .findElement(By.css("div.all-departments a:nth-child(2)"))
      .then(function(element) {
        element.click();
        return driver.wait(until.elementLocated(By.css("h1")), 1000);
      })
      .then(function() {
        done();
      });
  });

  it("... and make sure only user from IT department is shown", function(done) {
    driver
      .findElements(By.css("td.user_department"))
      .then(function(elements) {
        expect(elements.length).to.be.equal(1);
        return elements[0].getText();
      })
      .then(function(text) {
        expect(text).to.be.equal("IT");
        done();
      });
  });

  it('Click on "Sales"', function(done) {
    driver
      // Departments are ordered by names so we are sure that second item
      // after general link "All" is going to be "Sales"
      .findElement(By.css("div.all-departments a:nth-child(3)"))
      .then(function(element) {
        element.click();
        return driver.wait(until.elementLocated(By.css("h1")), 1000);
      })
      .then(function() {
        done();
      });
  });

  it("... department and make sure that only one user from that department is shown", function(done) {
    driver
      .findElements(By.css("td.user_department"))
      .then(function(elements) {
        expect(elements.length).to.be.equal(1);
        return elements[0].getText();
      })
      .then(function(text) {
        expect(text).to.be.equal("Sales");
        done();
      });
  });

  it('Click on "All" filter', function(done) {
    driver
      .findElement(By.css("div.all-departments a:nth-child(1)"))
      .then(function(element) {
        element.click();
        return driver.wait(until.elementLocated(By.css("h1")), 1000);
      })
      .then(function() {
        done();
      });
  });

  it("... and make sure that both users are presenyed", function(done) {
    driver.findElements(By.css("td.user_department")).then(function(elements) {
      expect(elements.length).to.be.equal(2);
      done();
    });
  });

  after(function(done) {
    driver.quit().then(function() {
      done();
    });
  });
});

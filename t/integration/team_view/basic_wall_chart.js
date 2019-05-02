"use strict";

var test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  Promise = require("bluebird"),
  until = require("selenium-webdriver").until,
  _ = require("underscore"),
  register_new_user_func = require("../../lib/register_new_user"),
  login_user_func = require("../../lib/login_with_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  add_new_user_func = require("../../lib/add_new_user"),
  logout_user_func = require("../../lib/logout_user"),
  config = require("../../lib/config"),
  new_department_form_id = "#add_new_department_form",
  application_host = config.get_application_host(),
  company_edit_form_id = "#company_edit_form",
  department_edit_form_id = "#department_edit_form";

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (supervisor and member of Sales department)
 *    * Create a new user B in Sales department
 *    * Open Team view page and make sure that both users are shown A and B
 *    * Create new department IT
 *    * Create new user C and make sure that he is a member and supervisor of IT department.
 *    * Login as B
 *    * Open Team view and make sure that it shows only two users A and B
 *     * Login as A
 *     * Open Team view and make sure that all three users are shown as A is admin
 *     * Update IT department to be supervised by user B
 *      * Login as B
 *    * Open Team view and make sure that it shows three users A, B, and C
 *    * Login with user C
 *    * Make sure that Team view page shows only user C
 *
 *    * Login as admin user A
 *    * Update company settings to have share_all_absences be TRUE
 *    * Login with user C
 *    * Make sure that Team view page shows all users from within company
 *
 * */

// Helper function to check that provided users (email) are shown on the Team view
// page
function check_teamview(data, emails) {
  return open_page_func({
    url: application_host + "calendar/teamview/",
    driver: data.driver
  }).then(function(data) {
    var promise_to_check = data.driver
      .findElements(By.css("tr.teamview-user-list-row > td.left-column-cell"))

      // Make sure that number of users is as expected
      .then(function(elements) {
        expect(elements.length).to.be.equal(emails.length);

        return Promise.all(
          _.map(elements, function(el) {
            return el.getText();
          })
        );
      })

      // Make sure that users are actually those as expected
      .then(function(full_names) {
        // The idea is to extract unique tokens from provided emails
        var tokens_from_emails = _.map(emails, function(email) {
          return email.substring(0, email.lastIndexOf("@"));
        }).sort();

        // ... extract unique tokens from full names on the page
        var tokens_from_name = _.map(full_names, function(name) {
          return name.substring(4, name.lastIndexOf(" "));
        }).sort();

        // ... and make sure that they are matched
        expect(tokens_from_emails).to.be.eql(tokens_from_name);

        return Promise.resolve(data);
      });

    return promise_to_check;
  });
}

describe("Check basic scenario for Team view page", function() {
  this.timeout(config.get_execution_timeout());

  var driver, user_A, user_B, user_C;

  test.it("Performing registration process", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver;
      user_A = data.email;
      done();
    });
  });

  it("Create new user B", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver,
      // We have just one department so far
      department_index: "0"
    }).then(function(data) {
      user_B = data.new_user_email;
      done();
    });
  });

  it("Make sure that both users are shown on Team view page", function(done) {
    check_teamview({ driver: driver }, [user_A, user_B]).then(function() {
      done();
    });
  });

  it('Create new department: "IT"', function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("... open new department popup and submit form", function(done) {
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

  it("Create user C", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver,
      // We know that departments are ordered alphabetically, so newly
      // added "ID" is before default "Sales" one
      department_index: "0"
    }).then(function(data) {
      user_C = data.new_user_email;
      done();
    });
  });

  it("Make sure user C is superviser of IT department", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    })
      .then(() =>
        driver
          .findElements(By.css('a[href*="/settings/departments/edit/"]'))
          .then(links => links[0].click())
      )
      .then(() =>
        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: 'select[name="boss_id"]',
              // because we have test names generated based on time, user C
              // is going to be last in a drop down
              option_selector: "option:nth-child(3)"
            }
          ],
          submit_button_selector:
            department_edit_form_id + ' button[type="submit"]',
          message: /Department .* was updated/
        })
      )
      .then(() => done());
  });

  it("Logout from A account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login as user B", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_B,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("and make sure that only user A and B are presented", function(done) {
    check_teamview({ driver: driver }, [user_A, user_B]).then(function() {
      done();
    });
  });

  it("Logout from B account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login back as user A", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_A,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("and make sure that all users are shown:  A, B, and C", function(done) {
    check_teamview({ driver: driver }, [user_A, user_B, user_C]).then(
      function() {
        done();
      }
    );
  });

  it("Update IT department to be supervised by user B", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    })
      .then(() =>
        driver
          .findElements(By.css('a[href*="/settings/departments/edit/"]'))
          .then(links => links[0].click())
      )
      .then(() =>
        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: 'select[name="boss_id"]',
              // because we have test names generated based on time, user B
              // is going to be second one in a drop down as it was added before
              // all other ones
              option_selector: "option:nth-child(2)"
            }
          ],
          submit_button_selector:
            department_edit_form_id + ' button[type="submit"]',
          message: /Department .* was updated/
        })
      )
      .then(() => done());
  });

  it("Logout from A account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login as user B", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_B,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("and make sure that all users are shown:  A, B, and C", function(done) {
    check_teamview({ driver: driver }, [user_A, user_B, user_C]).then(
      function() {
        done();
      }
    );
  });

  it("Logout from admin account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login as user C", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_C,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("and make sure that only one user C is here", function(done) {
    check_teamview({ driver: driver }, [user_C]).then(function() {
      done();
    });
  });

  it("Logout from user C account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login as user A", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_A,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Open page for editing company details", function(done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Check that company is been updated if valid values are submitted", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: company_edit_form_id + ' input[name="share_all_absences"]',
          tick: true,
          value: "on"
        }
      ],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true
    }).then(function() {
      done();
    });
  });

  it("Logout from user A account", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("Login as user C", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: user_C,
      driver: driver
    }).then(function() {
      done();
    });
  });

  it("and make sure that all users are shown on Team view page", function(done) {
    check_teamview({ driver: driver }, [user_A, user_B, user_C]).then(
      function() {
        done();
      }
    );
  });

  after(function(done) {
    driver.quit().then(function() {
      done();
    });
  });
});

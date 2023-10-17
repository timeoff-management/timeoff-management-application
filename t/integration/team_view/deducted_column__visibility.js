"use strict"

/*
 *  Scenario:
 *
 *    Check that values for new columns are shown only for employess
 *    currently login user can supervise.
 *
 *    The reason for this sceanrio is because in UK for instance it is illegal to share
 *    details for employees who are not supervisers. Peers should not know how many days
 *    their coleagues were off sick for instance.
 *
 *    * create account by admin user A
 *    * add user B
 *    * add user C
 *    * ensure company has "Share absences between all employees" flag ON
 *    * make user B to be superviser of user C
 *    * login as user A and ensure team view shows deducted values for all three users
 *    * login as user B and ensure she sees deducted days only for user B (self) and user C
 *      but not for user A
 *    * login as user C and ensure she sees only values for her account
 *
 * */

const test = require("selenium-webdriver/testing"),
  By = require("selenium-webdriver").By,
  Promise = require("bluebird"),
  expect = require("chai").expect,
  add_new_user_func = require("../../lib/add_new_user"),
  check_elements_func = require("../../lib/check_elements"),
  config = require("../../lib/config"),
  login_user_func = require("../../lib/login_with_user"),
  logout_user_func = require("../../lib/logout_user"),
  open_page_func = require("../../lib/open_page"),
  register_new_user_func = require("../../lib/register_new_user"),
  submit_form_func = require("../../lib/submit_form"),
  user_info_func = require("../../lib/user_info"),
  application_host = config.get_application_host(),
  new_department_form_id = "#add_new_department_form",
  company_edit_form_id = "#company_edit_form"

describe("Check that values for new columns are shown only for employess currently login user can supervise", function() {
  this.timeout(config.get_execution_timeout())

  let driver, email_A, user_id_A, email_B, user_id_B, email_C, user_id_C

  it("Register new company as admin user A", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(data => {
      driver = data.driver
      email_A = data.email
      done()
    })
  })

  it("Create second user B", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(data => {
      email_B = data.new_user_email
      done()
    })
  })

  it("Create second user C", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(data => {
      email_C = data.new_user_email
      done()
    })
  })

  it("Obtain information about user A", function(done) {
    user_info_func({
      driver: driver,
      email: email_A
    }).then(data => {
      user_id_A = data.user.id
      done()
    })
  })

  it("Obtain information about user B", function(done) {
    user_info_func({
      driver: driver,
      email: email_B
    }).then(data => {
      user_id_B = data.user.id
      done()
    })
  })

  it("Obtain information about user C", function(done) {
    user_info_func({
      driver: driver,
      email: email_C
    }).then(data => {
      user_id_C = data.user.id
      done()
    })
  })

  it("Open page for editing company details", function(done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver
    }).then(() => done())
  })

  it('Ensure company has "Share absences between all employees" flag OFF', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: company_edit_form_id + ' input[name="share_all_absences"]',
          value: "off",
          tick: true
        }
      ]
    }).then(() => done())
  })

  it("... and tick that box ON", function(done) {
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
    }).then(() => done())
  })

  it("Open department management page", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    }).then(() => done())
  })

  it("Add new department and make its approver to be user B", function(done) {
    driver
      .findElement(By.css("#add_new_department_btn"))
      .then(el => el.click())
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: `${new_department_form_id} input[name="name__new"]`,
              // Just to make sure it is always first in the lists
              value: "AAAAA"
            },
            {
              selector: `${new_department_form_id} select[name="allowance__new"]`,
              option_selector: 'option[value="15"]',
              value: "15"
            },
            {
              selector: `${new_department_form_id} select[name="boss_id__new"]`,
              option_selector: `select[name="boss_id__new"] option[value="${user_id_B}"]`
            }
          ],
          submit_button_selector: `${new_department_form_id} button[type="submit"]`,
          message: /Changes to departments were saved/
        }).then(function() {
          done()
        })
      })
  })

  it("Open user editing page for user B", function(done) {
    open_page_func({
      url: `${application_host}users/edit/${user_id_C}/`,
      driver: driver
    }).then(() => done())
  })

  it("And make sure it is part of the newly added department", function(done) {
    submit_form_func({
      submit_button_selector: "button#save_changes_btn",
      driver: driver,
      form_params: [
        {
          selector: 'select[name="department"]',
          // Newly added department should be first in the list as it is
          // sorted by AZ and department started with AA
          option_selector: 'select[name="department"] option:nth-child(1)'
        }
      ],
      message: /Details for .* were updated/
    }).then(function() {
      done()
    })
  })

  it("As user A ensure team view shows deducted values for all three users", function(done) {
    open_page_func({
      url: `${application_host}calendar/teamview/`,
      driver: driver
    })
      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(function() {
        done()
      })
  })

  it("Logout from user A (admin)", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(() => done())
  })

  it("Login as user B", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: email_B,
      driver: driver
    }).then(() => done())
  })

  it("Login as user B and ensure she sees deducted days only for user B (self) and user C but not for user A", function(done) {
    open_page_func({
      url: `${application_host}calendar/teamview/`,
      driver: driver
    })
      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(function() {
        done()
      })
  })

  it("Logout from user B", function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(() => done())
  })

  it("Login as user C", function(done) {
    login_user_func({
      application_host: application_host,
      user_email: email_C,
      driver: driver
    }).then(() => done())
  })

  it("Login as user C and ensure she sees only values for her account", function(done) {
    open_page_func({
      url: `${application_host}calendar/teamview/`,
      driver: driver
    })
      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("")
        return Promise.resolve(1)
      })

      .then(() =>
        driver.findElement(
          By.css(
            `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`
          )
        )
      )
      .then(el => el.getText())
      .then(txt => {
        expect(txt).to.be.eql("0")
        return Promise.resolve(1)
      })

      .then(function() {
        done()
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

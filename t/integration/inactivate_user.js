'use strict'

const test = require('selenium-webdriver/testing');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const moment = require('moment');
  const bluebird = require('bluebird');
  const until = require('selenium-webdriver').until;
  const register_new_user_func = require('../lib/register_new_user');
  const login_user_func = require('../lib/login_with_user');
  const open_page_func = require('../lib/open_page');
  const submit_form_func = require('../lib/submit_form');
  const add_new_user_func = require('../lib/add_new_user');
  const logout_user_func = require('../lib/logout_user');
  const check_elements_func = require('../lib/check_elements');
  const teamview_check_func = require('../lib/teamview_check_user');
  const user_info_func = require('../lib/user_info');
  const config = require('../lib/config');
  const application_host = config.get_application_host();
  const department_edit_form_id = '#department_edit_form'

/*
 * Scenario to check:
 *  * Add MANGER_A
 *  * Add EMPLOYEE
 *  * Make sure department has MANAGER_A as a superviser
 *  * Make sure EMPLOYEE shows up on the Team view page
 *  * Try to add new department and make sure EMPLOYEE is among potential approvers
 *  * Logout from super admin
 *  * Make sure EMPLOYEE is able to login
 *  * Login as ADMIN
 *  * Mark EMPLOYEE to have "end date" in the past
 *  * Make sure EMPLOYEE is not on Team view page anymore
 *  * Make sure EMPLOYEE is on the Users page
 *  * Try to add new department and make sure that EMPLOYEE is not among potentual approvers
 *  * Logout from ADMIN user
 *  * Try to login as EMPLOYEE and make sure system rejects
 *
 * */

describe('Dealing with inactive users', function() {
  this.timeout(config.get_execution_timeout())

  let email_admin,
    admin_user_id,
    email_manager,
    manager_user_id,
    email_employee,
    employee_user_id,
    employee_id,
    driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      email_admin = data.email
      done()
    })
  })

  it('Create MANAGER', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      email_manager = data.new_user_email
      done()
    })
  })

  it('Create EMPLOYEE', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      email_employee = data.new_user_email
      done()
    })
  })

  it('Open department management page', function(done) {
    open_page_func({
      url: application_host + 'settings/departments/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Update department to be supervised by MANAGER', function(done) {
    open_page_func({
      url: application_host + 'settings/departments/',
      driver
    })
      .then(() =>
        driver
          .findElements(By.css('a[href*="/settings/departments/edit/"]'))
          .then(links => links[0].click())
      )
      .then(() =>
        submit_form_func({
          driver,
          form_params: [
            {
              selector: 'input[name="name"]',
              // Just to make sure it is always first in the lists
              value: 'AAAAA'
            },
            {
              selector: 'select[name="allowance"]',
              option_selector: 'option[value="15"]',
              value: '15'
            },
            {
              selector: 'select[name="boss_id"]',
              option_selector: 'select[name="boss_id"] option:nth-child(2)'
            }
          ],
          submit_button_selector:
            department_edit_form_id + ' button[type="submit"]',
          message: /Department .* was updated/
        })
      )
      .then(() => done())
  })

  it('Make sure EMPLOYEE shows up on the Team view page', function(done) {
    teamview_check_func({
      driver,
      emails: [email_admin, email_manager, email_employee],
      is_link: true
    }).then(function() {
      done()
    })
  })

  it('Open departments management page', function(done) {
    open_page_func({
      url: application_host + 'settings/departments/',
      driver
    }).then(function() {
      done()
    })
  })

  it('obtain detailed info about employee (ID etc)', function(done) {
    user_info_func({
      driver,
      email: email_employee
    }).then(function(data) {
      employee_id = data.user.id
      done()
    })
  })

  it('See if EMPLOYEE is among possible approvers', function(done) {
    driver
      .findElements(
        By.css(
          'select[name="boss_id__new"] option[value="' + employee_id + '"]'
        )
      )
      .then(function(option) {
        expect(option).to.be.not.empty
        done()
      })
  })

  it('Logout from admin account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login as an EMPLOYEE to make sure it is possible', function(done) {
    login_user_func({
      application_host,
      user_email: email_employee,
      driver
    }).then(function() {
      done()
    })
  })

  it('Logout from EMPLOYEE account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Login back as ADMIN', function(done) {
    login_user_func({
      application_host,
      user_email: email_admin,
      driver
    }).then(function() {
      done()
    })
  })

  it('Open employee details page', function(done) {
    open_page_func({
      url: application_host + 'users/edit/' + employee_id + '/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Mark EMPLOYEE as one inactive one by specifying end date to be in past', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input#end_date_inp',
          value: moment()
            .subtract(1, 'days')
            .format('YYYY-MM-DD')
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/
    }).then(function() {
      done()
    })
  })

  it('Make sure EMPLOYEE is not on Team view page anymore', function(done) {
    teamview_check_func({
      driver,
      emails: [email_admin, email_manager],
      is_link: true
    }).then(function() {
      done()
    })
  })

  it('Open users list page', function(done) {
    open_page_func({
      url: application_host + 'users/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Make sure that EMPLOYEE still is shown on users page decpite being inactive', function(done) {
    driver.findElements(By.css('td.user_department')).then(function(elements) {
      expect(elements.length).to.be.equal(3)
      done()
    })
  })

  it('Check that employee is striked in the list', function(done) {
    driver
      .findElement(By.css('a[href="/users/edit/' + employee_id + '/"]'))
      .then(el => el.findElements(By.tagName('s')))
      .then(els => {
        if (els.length === 1) {
          done()
        } else {
          throw new Error('User is not striked')
        }
      })
  })

  it('Open department settings page', function(done) {
    open_page_func({
      url: application_host + 'settings/departments/',
      driver
    }).then(function() {
      done()
    })
  })

  it('Try to add new department and make sure that EMPLOYEE is not among potentual approvers', function(done) {
    driver
      .findElements(
        By.css(
          'select[name="boss_id__new"] option[value="' + employee_id + '"]'
        )
      )
      .then(function(option) {
        expect(option).to.be.empty
        done()
      })
  })

  it('Logout from admin account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('Try to login as EMPLOYEE and make sure system rejects', function(done) {
    login_user_func({
      application_host,
      user_email: email_employee,
      driver,
      should_fail: true
    }).then(function() {
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

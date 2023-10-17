'use strict'

var test = require('selenium-webdriver/testing'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  By = require('selenium-webdriver').By,
  expect = require('chai').expect,
  _ = require('underscore'),
  Promise = require('bluebird'),
  until = require('selenium-webdriver').until,
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user'),
  new_department_form_id = '#add_new_department_form'

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create line manager user
 *    - Create new ordenry user
 *    - Create new department
 *    - New department to be managed by line manager user
 *    - Ordernary user belongs to new departmen
 *    - Login with ordenry user and ensure that she can create leave
 *      requests only for herself
 *    - Login as a line manager and make sure she can create leave
 *      requests for herself and ordanry user
 *    - Login as a admin user and make sure she can create leave
 *      request for all users
 *
 * */

describe('Request leave for outher users', function() {
  this.timeout(config.get_execution_timeout())

  var ordenary_user_email,
    line_manager_email,
    admin_email,
    ordenary_user_id,
    driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      admin_email = data.email
      done()
    })
  })

  it('Create new line manager user', function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      line_manager_email = data.new_user_email
      done()
    })
  })

  it('Create new ordanry user', function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      ordenary_user_email = data.new_user_email
      done()
    })
  })

  it('Open department management page', function(done) {
    open_page_func({
      url: application_host + 'settings/departments/',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Save ID of ordenry user', function(done) {
    driver
      .findElement(By.css('select[name="boss_id__new"] option:nth-child(3)'))
      .then(function(el) {
        return el.getAttribute('value')
      })
      .then(function(value) {
        ordenary_user_id = value
        expect(ordenary_user_id).to.match(/^\d+$/)
        done()
      })
  })

  it(
    'Add new department and make its approver to be newly added ' +
      'line manager (she is second in a list as users are ordered by AZ)',
    function(done) {
      driver
        .findElement(By.css('#add_new_department_btn'))
        .then(function(el) {
          return el.click()
        })
        .then(function() {
          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000)

          submit_form_func({
            driver: driver,
            form_params: [
              {
                selector: new_department_form_id + ' input[name="name__new"]',
                // Just to make sure it is always first in the lists
                value: 'AAAAA'
              },
              {
                selector:
                  new_department_form_id + ' select[name="allowance__new"]',
                option_selector: 'option[value="15"]',
                value: '15'
              },
              {
                selector:
                  new_department_form_id + ' select[name="boss_id__new"]',
                option_selector:
                  'select[name="boss_id__new"] option:nth-child(2)'
              }
            ],
            submit_button_selector:
              new_department_form_id + ' button[type="submit"]',
            message: /Changes to departments were saved/
          }).then(function() {
            done()
          })
        })
    }
  )

  it('Open user editing page for ordenry user', function(done) {
    open_page_func({
      url: application_host + 'users/edit/' + ordenary_user_id + '/',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('And make sure it is part of the newly added department', function(done) {
    submit_form_func({
      submit_button_selector: 'button#save_changes_btn',
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

  it('Logout from admin acount', function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Login as ordenary user', function(done) {
    login_user_func({
      application_host: application_host,
      user_email: ordenary_user_email,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('And make sure that user cannot select other users when requesting new leave', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        driver
          .isElementPresent(By.css('select#employee'))
          .then(function(is_present) {
            expect(is_present).to.be.equal(false)
            done()
          })
      })
  })

  it('Logout from ordenary acount', function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Login as line manager user', function(done) {
    login_user_func({
      application_host: application_host,
      user_email: line_manager_email,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it(
    'And make sure that user can select herself and ordenary user (because she ' +
      'belongs to the department managed by current line manager)',
    function(done) {
      driver
        .findElement(By.css('#book_time_off_btn'))
        .then(function(el) {
          return el.click()
        })
        .then(function() {
          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000)

          // Make sure there is a drop down with users
          driver
            .isElementPresent(By.css('select#employee'))
            .then(function(is_present) {
              expect(is_present).to.be.equal(true)
              done()
            })
        })
    }
  )

  it('... make sure there are two records in it', function(done) {
    driver
      .findElements(By.css('select#employee option'))
      .then(function(elements) {
        expect(elements.length).to.be.equal(2)
        done()
      })
  })

  it('Make sure ordenary user is in that drop down list', function(done) {
    driver
      .findElement(By.css('select#employee option:nth-child(2)'))
      .then(function(el) {
        return el.getInnerHtml()
      })
      .then(function(text) {
        expect(text).to.match(
          new RegExp(
            ordenary_user_email.substring(
              0,
              ordenary_user_email.lastIndexOf('@')
            )
          )
        )
        done()
      })
  })

  it('Logout from ordenary acount', function(done) {
    logout_user_func({
      application_host: application_host,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Login as admin user', function(done) {
    login_user_func({
      application_host: application_host,
      user_email: admin_email,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Open calendar page', function(done) {
    open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('And make sure that user can select all three users', function(done) {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        // Make sure there is a drop down with users
        driver
          .isElementPresent(By.css('select#employee'))
          .then(function(is_present) {
            expect(is_present).to.be.equal(true)
          })

        // Make sure there are three records in it (all users for company)
        driver
          .findElements(By.css('select#employee option'))
          .then(function(elements) {
            expect(elements.length).to.be.equal(3)
            done()
          })
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

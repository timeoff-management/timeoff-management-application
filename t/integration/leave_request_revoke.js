
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  moment                 = require('moment'),
  Promise                = require("bluebird"),
  until                  = require('selenium-webdriver').until,
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  check_booking_func     = require('../lib/check_booking_on_calendar'),
  check_elements_func    = require('../lib/check_elements'),
  application_host       = 'http://localhost:3000/';

/*
 *  Scenario to check:
 *    * Add MANAGER_A
 *    * Add MANAGER_B
 *    * Add EMPLOYEE
 *    * Make sure department has MANAGER_A as a supervisor
 *    * Login as a EMPLOYEE
 *    * Book a leave request
 *    * Login as MANAGER_A and approve leave request
 *    * Login as ADMIN and change supervisor to be MANAGER_B
 *    * Login as an EMPLOYEE and revoke leave request
 *
 *    * Login as a MANAGER_B and make sure that there is
 *      a revoke request to process
 *    * Approve revoke request and make sure that EMPLOYEE
 *    does not have leave any more
 *
 * */

describe('Revoke leave request', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin   , admin_user_id,
        email_manager_a, manager_a_user_id,
        email_manager_b, manager_b_user_id,
        email_employee, employee_user_id;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })

    // Create MANAGER_A-to-be user
    .then(function(data){
        email_admin = data.email;
        console.log('  Create MANAGER_A-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Create MANAGER_A-to-be user
    .then(function(data){

        email_manager_a = data.new_user_email;

        console.log('  Create MANAGER_B-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })

    // Create EMPLOYEE-to-be user
    .then(function(data){

        email_manager_b = data.new_user_email;

        console.log('  Create EMPLOYEE-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })


    // Open department management page
    .then(function(data){
        email_employee = data.new_user_email;
        console.log('    Update department to be supervised by MANAGER_A');
        return open_page_func({
            url    : application_host + 'settings/departments/',
            driver : data.driver,
        });
    })
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name__0"]',
                // Just to make sure it is always first in the lists
                value : 'AAAAA',
            },{
                selector        : 'select[name="allowence__0"]',
                option_selector : 'option[value="15"]',
                value : '15',
            },{
                selector        : 'select[name="boss_id__0"]',
                option_selector : 'select[name="boss_id__0"] option:nth-child(2)',
            }],
            message : /Changes to departments were saved/,
        });
    })
    // Logout from admin account
    .then(function(data){
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as EMPLOYEE user
    .then(function(data){
      console.log('Login as an EMPLOYEE');
      return login_user_func({
        application_host : application_host,
        user_email       : email_employee,
        driver           : data.driver,
      });
    })

    // Open calendar page
    .then(function(data){
      console.log('And book a holiday');
      return open_page_func({
        url    : application_host + 'calendar/?show_full_year=1',
        driver : data.driver,
      });
    })
    // And make sure that it is calendar indeed
    .then(function(data){
      data.driver.getTitle()
        .then(function(title){
          expect(title).to.be.equal('Calendar');
        });
      return Promise.resolve(data);
    })
    // Request new leave
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })

        // Create new leave request
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          return submit_form_func({
            driver      : driver,
            // The order matters here as we need to populate dropdown prior date filds
            form_params : [{
                selector        : 'select[name="from_date_part"]',
                option_selector : 'option[value="2"]',
                value           : "2",
            },{
                selector : 'input#from',
                value : '2015-06-15',
            },{
                selector : 'input#to',
                value : '2015-06-16',
            }],
            message : /New leave request was added/,
          });

        })

        // Check that all days are marked as pended
        .then(function(){
          return check_booking_func({
            driver         : driver,
            full_days      : [moment('2015-06-16')],
            halfs_1st_days : [moment('2015-06-15')],
            type           : 'pended',
          });
        });
    })
    // Logout from EMPLOYEE account
    .then(function(data){
      console.log('Logout from EMPLOYEE account');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as MANAGER_A user
    .then(function(data){
      console.log('Login as a MANAGER_A');
      return login_user_func({
        application_host : application_host,
        user_email       : email_manager_a,
        driver           : data.driver,
      });
    })
    // Open requests page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'requests/',
        driver : data.driver,
      });
    })
    // Make sure newly created request is shown for approval
    .then(function(data){
      console.log('Make sure that newly created request is waiting for approval');
      return check_elements_func({
        driver : data.driver,
        elements_to_check : [{
          selector : 'div[vpp="pending_for__'+email_employee+'"] .btn-warning',
          value    : "Reject",
        }],
      });
    })
    // Approve newly added leave request
    .then(function(data){
      console.log('Approve request');
      return data.driver.findElement(By.css(
        'div[vpp="pending_for__'+email_employee+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })

    // Logout from MANAGER_A account
    .then(function(data){
      console.log('Logout from MANAGER_A account');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as ADMIN user
    .then(function(data){
      console.log('Login as ADMIN');
      return login_user_func({
        application_host : application_host,
        user_email       : email_admin,
        driver           : data.driver,
      });
    })

    // Open department management page
    .then(function(data){
      console.log('    Update department to be supervised by MANAGER_B');
      return open_page_func({
        url    : application_host + 'settings/departments/',
        driver : data.driver,
      });
    })
    .then(function(data){
       return submit_form_func({
        driver      : data.driver,
        form_params : [{
          selector : 'input[name="name__0"]',
          // Just to make sure it is always first in the lists
          value : 'AAAAA',
        },{
          selector        : 'select[name="allowence__0"]',
          option_selector : 'option[value="15"]',
          value : '15',
        },{
          selector        : 'select[name="boss_id__0"]',
          option_selector : 'select[name="boss_id__0"] option:nth-child(3)',
        }],
        message : /Changes to departments were saved/,
      });
    })
    // Logout from admin account
    .then(function(data){
      console.log('Logout from ADMIN account');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as EMPLOYEE user
    .then(function(data){
      console.log('Login as an EMPLOYEE');
      return login_user_func({
        application_host : application_host,
        user_email       : email_employee,
        driver           : data.driver,
      });
    })


    // Open requests page
    .then(function(data){
      console.log('Open requests page');
      return open_page_func({
        url    : application_host + 'requests/',
        driver : data.driver,
      });
    })
    // Approve newly added leave request
    .then(function(data){
      console.log('Revoke request');
      return data.driver.findElement(By.css(
        'button.revoke-btn'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })

    // Logout from EMPLOYEE account
    .then(function(data){
      console.log('Logout from EMPLOYEE account');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as MANAGER_B user
    .then(function(data){
      console.log('Login as MANAGER_B');
      return login_user_func({
        application_host : application_host,
        user_email       : email_manager_b,
        driver           : data.driver,
      });
    })
    // Open requests page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'requests/',
        driver : data.driver,
      });
    })
    // Make sure newly revoked request is shown for approval
    .then(function(data){
      console.log('Make sure that request to be revoked is shown');
      return check_elements_func({
        driver : data.driver,
        elements_to_check : [{
          selector : 'div[vpp="pending_for__'+email_employee+'"] .btn-warning',
          value    : "Reject",
        }],
      });
    })
    // Approve revoke request
    .then(function(data){
      console.log('Approve revoke request');
      return data.driver.findElement(By.css(
        'div[vpp="pending_for__'+email_employee+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  });

});

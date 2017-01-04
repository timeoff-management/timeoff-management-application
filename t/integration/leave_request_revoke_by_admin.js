
'use strict';

var test             = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    moment           = require('moment'),
    until            = require('selenium-webdriver').until,
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    check_elements_func    = require('../lib/check_elements'),
    check_booking_func     = require('../lib/check_booking_on_calendar'),
    add_new_user_func      = require('../lib/add_new_user');


/*
 *  Scenario to check:
 *    * Add EMPLOYEE
 *    * Login as a EMPLOYEE
 *    * Book a leave request
 *    * Login as MANAGER and approve leave request
 *    * Revoke recently added leave request
 *    * Approve revoke request and make sure that EMPLOYEE
 *    does not have leave any more
 *
 * */

describe('Revoke leave request by Admin', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin   , admin_user_id,
        email_employee, employee_user_id;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })

    // Create EMPLOYEE-to-be user
    .then(function(data){
      email_admin = data.email;

      console.log('  Create EMPLOYEE-to-be user');
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Logout from admin account
    .then(function(data){
      email_employee = data.new_user_email;

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
                value : '2017-06-15',
            },{
                selector : 'input#to',
                value : '2017-06-16',
            }],
            message : /New leave request was added/,
          });

        })

        // Check that all days are marked as pended
        .then(function(){
          return check_booking_func({
            driver         : driver,
            full_days      : [moment('2017-06-16')],
            halfs_1st_days : [moment('2017-06-15')],
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
    // Login as an ADMIN user
    .then(function(data){
      console.log('Login as an ADMIN');
      return login_user_func({
        application_host : application_host,
        user_email       : email_admin,
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
          selector : 'tr[vpp="pending_for__'+email_employee+'"] .btn-warning',
          value    : "Reject",
        }],
      });
    })
    // Approve newly added leave request
    .then(function(data){
      console.log('Approve request');
      return data.driver.findElement(By.css(
        'tr[vpp="pending_for__'+email_employee+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })


    // Obtain employee ID from department managment page
    .then(function(data){
      console.log('    Fetch employee user ID');
      return open_page_func({
        url    : application_host + 'settings/departments/',
        driver : data.driver,
      });
    })
    .then(function(data){
      return data.driver.findElement(
        By.css('select[name="boss_id__new"] option:nth-child(2)')
      )
      .then(function(el){
        return el.getAttribute('value');
      })
      .then(function(value){
        employee_user_id = value;

        expect( employee_user_id ).to.match(/^\d+$/);
        return Promise.resolve(data);
      });
    })


    // Open user editing page for Employee
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/edit/'+employee_user_id+'/',
        driver : data.driver,
      });
    })

    // And revoke her time off
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
          selector : 'tr[vpp="pending_for__'+email_employee+'"] .btn-warning',
          value    : "Reject",
        }],
      });
    })
    // Approve revoke request
    .then(function(data){

      console.log('Approve revoke request');
      return data.driver.findElement(By.css(
        'tr[vpp="pending_for__'+email_employee+'"] .btn-success'
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


'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  moment                 = require('moment'),
  bluebird               = require("bluebird"),
  until                  = require('selenium-webdriver').until,
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  check_elements_func    = require('../lib/check_elements'),
  teamview_check_func    = require('../lib/teamview_check_user'),
  user_info_func         = require('../lib/user_info'),
  application_host       = 'http://localhost:3000/';

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


describe('Dealing with inactive users', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin   , admin_user_id,
        email_manager, manager_user_id,
        email_employee, employee_user_id,
        employee_id;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })

    // Create MANAGER
    .then(function(data){
      email_admin = data.email;
      console.log('  Create MANAGER user');
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Create EMPLOYEE
    .then(function(data){
      email_manager = data.new_user_email;
      console.log('  Create EMPLOYEE');
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Open department management page
    .then(function(data){
      email_employee = data.new_user_email;
      console.log('  Update department to be supervised by MANAGER');
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

    // Make sure EMPLOYEE shows up on the Team view page
    .then(function(data){
      console.log('  Make sure EMPLOYEE shows up on the Team view page: ' + email_employee);
      return teamview_check_func({
        driver  : data.driver,
        emails  : [email_admin, email_manager, email_employee],
        is_link : true,
      })
    })

    // Open departments management page and see if EMPLOYEE is among possible approvers
    .then(function(data){
      console.log('  Checking that EMPLOYEE is available to be a boss');
      return open_page_func({
        url    : application_host + 'settings/departments/',
        driver : data.driver,
      });
    })
    .then(function(data){
      return user_info_func({
        driver : data.driver,
        email  : email_employee,
      });
    })
    .then(function(data){
      employee_id = data.user.id;

      return data.driver.findElements(By.css(
        'select[name="boss_id__new"] option[value="'+employee_id+'"]'
      ))
        .then(function(option){
          expect(option).to.be.not.empty;
          return bluebird.resolve(data);
        });
    })

    // Logout from admin account
    .then(function(data){
      console.log('  Log out from admin session');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Login as EMPLOYEE user
    .then(function(data){
      console.log('  Login as an EMPLOYEE to make sure it is possible');
      return login_user_func({
        application_host : application_host,
        user_email       : email_employee,
        driver           : data.driver,
      });
    })

    // Logout from EMPLOYEE account
    .then(function(data){
      console.log('  Log out from EMPLOYEE session');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Login as ADMIN user
    .then(function(data){
      console.log('  Login back as ADMIN');
      return login_user_func({
        application_host : application_host,
        user_email       : email_admin,
        driver           : data.driver,
      });
    })

    // Deactivate EMPLOYEE by setting the end date to be in past
    .then(function(data){
      console.log('  Mark EMPLOYEE as one inactive one by specifying end date to be in past');
      return open_page_func({
        url    : application_host + 'users/edit/'+employee_id+'/',
        driver : data.driver,
      });
    })
    .then(function(data){
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input#end_date_inp',
            value    : moment().subtract(1, 'days').format('YYYY-MM-DD'),
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .+ were updated/,
      })
    })

    // Make sure EMPLOYEE is not on Team view page anymore
    .then(function(data){
      console.log('  Make sure EMPLOYEE is not on Team view page anymore');
      return teamview_check_func({
        driver  : data.driver,
        emails  : [email_admin, email_manager],
        is_link : true,
      })
    })

    // Make sure EMPLOYEE is on the Users page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/',
        driver : data.driver,
      });
    })
    .then(function(data){
      console.log('  Make sure that EMPLOYEE still is shown on users page decpite been  in active');
      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(3);
          return bluebird.resolve(data);
        });
    })

    // Try to add new department and make sure that EMPLOYEE is not among potentual approvers
    .then(function(data){
      console.log('  Checking that EMPLOYEE is NOT available to be a boss');
      return open_page_func({
        url    : application_host + 'settings/departments/',
        driver : data.driver,
      });
    })
    .then(function(data){
      return data.driver.findElements(By.css(
        'select[name="boss_id__new"] option[value="'+employee_id+'"]'
      ))
        .then(function(option){
          expect(option).to.be.empty;
          return bluebird.resolve(data);
        });
    })

    // Logout from admin account
    .then(function(data){
      console.log('  Log out from admin session');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Try to login as EMPLOYEE and make sure system rejects
    .then(function(data){
      console.log('  Try to Login as an EMPLOYEE, should faile');
      return login_user_func({
        application_host : application_host,
        user_email       : email_employee,
        driver           : data.driver,
        should_fail      : true,
      });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  });

});

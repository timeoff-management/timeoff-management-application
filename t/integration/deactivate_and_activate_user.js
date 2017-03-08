
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  moment                 = require('moment'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  user_info_func         = require('../lib/user_info'),
  config                 = require('../lib/config'),
  application_host       = config.get_application_host();

/*
 * Scenario to check:
 *  * Create EMPLOYEE
 *  * Deactivate EMPLOYEE
 *  * Logout from ADMIN
 *  * Register new account for EMPLOYEE email
 *  * Logout
 *  * Login back as ADMIN
 *  * Try to activate EMPLOYEE back
 *  * Make sure system prevent of doing this
 *
 * */


describe('Deactivate and activate user', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin, email_employee, employee_id;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })

    // Create EMPLOYEE
    .then(function(data){
      email_admin = data.email;
      console.log('  Create EMPLOYEE');
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    .then(function(data){
      email_employee = data.new_user_email;
      return user_info_func({
        driver : data.driver,
        email  : email_employee,
      });
    })

    // Deactivate EMPLOYEE by setting the end date to be in past
    .then(function(data){
      console.log('  Mark EMPLOYEE as inactive by specifying end date to be in past');
      employee_id = data.user.id;
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
        should_be_successful : true,
      })
    })

    // Logout from ADMIN
    .then(function(data){
      console.log('  Log out from ADMIN session');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Register new account for EMPLOYEE email
    .then(function(){
      console.log('  Create another company for EMPLOYEE email');

      return register_new_user_func({
        application_host : application_host,
        user_email       : email_employee,
      });
    })

    // Logout from new company created by EMPLOYEE
    .then(function(data){
      console.log('  Log out from EMPLOYEE new company');
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

     // Login back as ADMIN
    .then(function(data){
      console.log('  Login back as ADMIN');
      return login_user_func({
        application_host : application_host,
        user_email       : email_admin,
        driver           : data.driver,
      });
    })

    // Try to activate EMPLOYEE back
    .then(function(data){
      console.log('  Try to activate EMPLOYEE back');
      return open_page_func({
        url    : application_host + 'users/edit/'+employee_id+'/',
        driver : data.driver,
      });
    })
    .then(function(data){
      console.log('    with end_date in future');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input#end_date_inp',
            value    : moment().add(1, 'days').format('YYYY-MM-DD'),
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /There is an active account with similar email somewhere within system/,
      })
    })
    .then(function(data){
      console.log('    with empty end_date');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input#end_date_inp',
            value    : '',
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /There is an active account with similar email somewhere within system/,
      })
    })
    .then(function(data){
      console.log('  Although setting edn_date to some value in past still works');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input#end_date_inp',
            value    : moment().subtract(3, 'days').format('YYYY-MM-DD'),
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .+ were updated/,
      })
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });
  });

});


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

  this.timeout( config.get_execution_timeout() );

  var email_admin, email_employee, employee_id, driver;

  it('Create new company', function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      email_admin = data.email;
      driver = data.driver;
      done();
    });
  });

  it("Create EMPLOYEE", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      email_employee = data.new_user_email;
      done();
    });
  });

  it("Obtain information about employee", function(done){
    user_info_func({
      driver : driver,
      email  : email_employee,
    })
    .then(function(data){
      employee_id = data.user.id;
      done();
    });
  });

  it('Mark EMPLOYEE as inactive by specifying end date to be in past', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+employee_id+'/',
      driver : driver,
    })
    .then(function(){
      submit_form_func({
        driver      : driver,
        form_params : [{
          selector : 'input#end_date_inp',
          value    : moment.utc().subtract(1, 'days').format('YYYY-MM-DD'),
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .+ were updated/,
        should_be_successful : true,
      })
      .then(function(){ done() });
    });
  });

  it("Logout from ADMIN", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it('Create another company for EMPLOYEE email', function(done){
    register_new_user_func({
      application_host : application_host,
      user_email       : email_employee,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Logout from new company created by EMPLOYEE", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login back as ADMIN", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_admin,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Try to activate EMPLOYEE back. Open details page", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+employee_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('... use end_date in future', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#end_date_inp',
        value    : moment.utc().add(1, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /There is an active account with similar email somewhere within system/,
    })
    .then(function(){ done() });
  });

  it("... use empty end_date", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#end_date_inp',
        value    : '',
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /There is an active account with similar email somewhere within system/,
    })
    .then(function(){ done() });
  });

  it('Although setting end_date to some value in past still works', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#end_date_inp',
        value    : moment.utc().subtract(3, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /Details for .+ were updated/,
    })
    .then(function(){ done() });
  });


  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

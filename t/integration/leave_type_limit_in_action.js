
'use strict';

var test             = require('selenium-webdriver/testing'),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    moment           = require('moment'),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    check_elements_func    = require('../lib/check_elements'),
    check_booking_func     = require('../lib/check_booking_on_calendar'),
    add_new_user_func      = require('../lib/add_new_user'),
    leave_type_edit_form_id='#leave_type_edit_form',
    config                 = require('../lib/config'),
    application_host       = config.get_application_host();

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update Holiday leave type to be limited
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request that exceed limit
 *    - Make sure that system rejected the request
 *    - Submit leave request that is under the limit
 *    - Make sure the system accepted the request
 *
 * */

describe('Leave type limits in actoion', function(){

  this.timeout( config.get_execution_timeout() );

  var non_admin_user_email, driver;

  it('Create new company', function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
  });

  it("Open page with leave types", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Check that it is possible to update Limits", function(done){
     submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[data-tom-leave-type-order="limit_0"]',
        value    : '3',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      should_be_successful : true,
      message : /Changes to leave types were saved/,
    })
   .then(function(){ done() });
  });

  it("Create new non-admin user", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      non_admin_user_email = data.new_user_email;
      done();
    });
  });

  it("Logout from admin account", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as non-admin user", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : non_admin_user_email,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Open calendar page", function(done){
    open_page_func({
      url    : application_host + 'calendar/?year=2015&show_full_year=1',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("And make sure that it is calendar indeed", function(done){
    driver.getTitle()
      .then(function(title){
        expect(title).to.be.equal('Calendar');
        done();
      });
  });

  it("Try to request new leave that exceed the limit", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
          form_params : [{
            selector : 'input#from',
            value : '2015-06-15',
          },{
            selector : 'input#to',
            value : '2015-06-18',
          }],
          message : /Adding requested .* absense would exceed maximum allowed for such type by 1/,
          multi_line_message : true,
        })
        .then(function(){ done() });
      });
  });

  it("Add a request that fits under the limit", function(done){
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
          form_params : [{
            selector : 'input#from',
            value : '2015-06-15',
          },{
            selector : 'input#to',
            value : '2015-06-17',
          }],
          message : /New leave request was added/,
        })
        // Check that all days are marked as pended
        .then(function(){
          check_booking_func({
            driver    : driver,
            full_days : [moment('2015-06-16'),moment('2015-06-16'),moment('2015-06-17')],
            type      : 'pended',
          })
          .then(function(){ done() });
        });
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

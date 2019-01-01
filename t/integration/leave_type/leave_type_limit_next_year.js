
'use strict';

const
  test             = require('selenium-webdriver/testing'),
    By               = require('selenium-webdriver').By,
  expect           = require('chai').expect,
  Promise          = require("bluebird"),
  moment           = require('moment'),
  until            = require('selenium-webdriver').until,
  login_user_func        = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func       = require('../../lib/logout_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  check_booking_func     = require('../../lib/check_booking_on_calendar'),
  add_new_user_func      = require('../../lib/add_new_user'),
  leave_type_edit_form_id='#leave_type_edit_form',
  config                 = require('../../lib/config'),
  application_host       = config.get_application_host();

const next_year = moment().add(1, 'y').format('YYYY');

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update Holiday leave type to be limited to 1 day
 *    - Create new user
 *    - Login as new user
 *    - Submit 1 day of the keave type in the next year
 *    - Make sure the system accepts the request
 *    - Login back as admin and approve the request
 *
 *    - Login back as a user and send another request for of 1 day in text year for the same leave type
 *    - Make sure system rejects the request
 *
 * */

describe('Leave type limits for next year: ' + next_year, function(){

  this.timeout( config.get_execution_timeout() );

  let admin_user_email, non_admin_user_email, driver;

  it('Create new company', function(done){
    register_new_user_func({application_host})
    .then(data =>{
      ({driver,email:admin_user_email} = data);
      done();
    });
  });

  it("Open page with leave types", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver,
    })
    .then(() => done());
  });

  it("Check that it is possible to update Limits", function(done){
    submit_form_func({
      driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[data-tom-leave-type-order="limit_0"]',
        value    : '1',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      should_be_successful : true,
      message : /Changes to leave types were saved/,
    })
    .then(() => done());
  });

  it("Create new non-admin user", function(done){
    add_new_user_func({ application_host, driver })
    .then(data => {
      non_admin_user_email = data.new_user_email;
      done();
    });
  });

  it("Logout from admin account", function(done){
    logout_user_func({application_host, driver})
    .then(() => done());
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
      url    : application_host + 'calendar/?year='+next_year+'&show_full_year=1',
      driver : driver,
    })
    .then(function(){ done() });
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
            value : next_year + '-05-11',
          },{
            selector : 'input#to',
            value : next_year + '-05-11',
          }],
          message : /New leave request was added/,
        })
        // Check that all days are marked as pended
        .then(function(){
          check_booking_func({
            driver    : driver,
            full_days : [moment(next_year + '-05-11')],
            type      : 'pended',
          })
          .then(function(){ done() });
        });
      });
  });

  it("Logout from regular user session", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as Admin", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : admin_user_email,
      driver           : driver,
    })
    .then(function(){ done() });
  })

  it("Open requests page", function(done){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Approve newly added leave request", function(done){
    driver
      .findElement(By.css(
        'tr[vpp="pending_for__'+non_admin_user_email+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        return driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ done() });
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
      url    : application_host + 'calendar/?year='+ next_year +'&show_full_year=1',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("And try to request one more day of the type already 100% taken", function(done){
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
            value : next_year + '-05-14',
          },{
            selector : 'input#to',
            value : next_year + '-05-14',
          }],
          message : /Failed to create a leave request/,
        })
        .then(function(){ done() });
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

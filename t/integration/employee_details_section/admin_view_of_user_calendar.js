

'use strict';

const By                 = require('selenium-webdriver').By,
  until                  = require('selenium-webdriver').until,
  Promise                = require("bluebird"),
  moment                 = require('moment'),
  expect                 = require('chai').expect,
  add_new_user_func      = require('../../lib/add_new_user'),
  check_elements_func    = require('../../lib/check_elements'),
  config                 = require('../../lib/config'),
  login_user_func        = require('../../lib/login_with_user'),
  logout_user_func       = require('../../lib/logout_user'),
  open_page_func         = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func       = require('../../lib/submit_form'),
  user_info_func         = require('../../lib/user_info'),
  application_host       = config.get_application_host(),
  check_booking_func     = require('../../lib/check_booking_on_calendar'),
  // TODO remove hard-coded values
  some_weekday_date      = '2020-01-10';

/*
 * Aim:
 *  To ensure admin can access employee's Calendar on Employee's details section and the
 *   calendar shows leaves.
 *
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as employee B and submit leave request
 *    * Login as admin user A
 *    * Go to user B details, ensure new request is shown on the Calendar section
 * */
describe('Ensure employee calendar from admin section shows bookings', function(){

  this.timeout( config.get_execution_timeout() );

  let driver, email_A, email_B, user_id_B;

  it("Register new company", (done) => {
    register_new_user_func({ application_host })
    .then(function(data){
      driver  = data.driver;
      email_A = data.email;
      done();
    });
  });

  it("Create second user B", (done) => {
    add_new_user_func({ application_host, driver })
    .then(function(data){
      email_B = data.new_user_email;
      done();
    });
  });

  it("Obtain information about user B", function(done){
    user_info_func({ driver, email: email_B })
    .then(function(data){
      user_id_B = data.user.id;
      done();
    });
  });

  it("Logout from user A (admin)", function(done){
    logout_user_func({ application_host, driver })
    .then(function(){ done() });
  });

  it("Login as user B", function(done){
    login_user_func({ application_host, driver, user_email: email_B })
    .then(function(){ done() });
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(el){
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000);
      })
      .then(function(){ done() });
  });

  it("Submit new leave request from user B", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#from',
        value    : some_weekday_date,
      },{
        selector : 'input#to',
        value    : some_weekday_date,
      }],
      message : /New leave request was added/,
    })
    .then(function(){done()});
  });

  it("Logout from user B", function(done){
    logout_user_func({ application_host, driver })
    .then(function(){ done() });
  });

  it("Login as admin user A", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_A,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it('Open user B calendar section and ensure the newly added booking is there', function(done){
    open_page_func({
      driver,
      url: `${application_host}users/edit/${user_id_B}/calendar/`,
    })
    .then(() => check_booking_func({
      driver         : driver,
      full_days      : [moment(some_weekday_date)],
      type           : 'pended',
    }))
    .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

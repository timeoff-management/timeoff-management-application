
'use strict';

var test             = require('selenium-webdriver/testing'),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    moment           = require('moment'),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    check_elements_func    = require('../lib/check_elements'),
    check_booking_func     = require('../lib/check_booking_on_calendar'),
  leave_type_edit_form_id='#leave_type_edit_form',
  leave_type_new_form_id ='#leave_type_new_form',
  config                 = require('../lib/config'),
  application_host       = config.get_application_host();

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new leave type (one tath is always at the start of list, e.g. AAA)
 *    - Create pended leave for that type
 *    - Try to remove the type
 *    - Ensure system prevent of doing this
 *
 * */

describe('Try to remove used leave type', function(){

  this.timeout( config.get_execution_timeout() );

  var driver;

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

  it("Add new leave type", function(done){
    driver
      .findElement(By.css('#add_new_leave_type_btn'))
      .then(function(el){ return el.click() })
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
          form_params : [{
            selector : leave_type_new_form_id+' input[name="name__new"]',
            value : 'AAAAA',
          },{
            selector : leave_type_new_form_id+' input[name="use_allowance__new"]',
            value    : 'on',
            tick     : true,
          }],
          submit_button_selector : leave_type_new_form_id+' button[type="submit"]',
          message : /Changes to leave types were saved/,
        })
        .then(function(){ done() });
      });
  });

  it("Open calendar page", function(done){
    open_page_func({
      url    : application_host + 'calendar/?show_full_year=1&year=2015',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Request new leave", function(done){
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })

      // Create new leave request
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
          // The order matters here as we need to populate dropdown prior date filds
          form_params : [{
            selector        : 'select[name="from_date_part"]',
            option_selector : 'option[value="2"]',
          },{
            selector : 'select[name="leave_type"]',
            option_selector : 'option[value="0"]',
          },{
            selector : 'input#from',
            value : '2015-06-15',
          },{
            selector : 'input#to',
            value : '2015-06-16',
          }],
          message : /New leave request was added/,
        })
        .then(function(){ done() });
      });
  });

  it("Check that all days are marked as pended", function(done){
    check_booking_func({
      driver         : driver,
      full_days      : [moment('2015-06-16')],
      halfs_1st_days : [moment('2015-06-15')],
      type           : 'pended',
    })
    .then(function(){ done() });
  });

  it("Open page with leave types", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Try to remove newly added leave type and ensure it fails", function(done){
    submit_form_func({
      driver : driver,
      submit_button_selector : leave_type_edit_form_id+' button[value="0"]',
      message : /Cannot remove leave type: type is in use/,
    })
    .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});


'use strict';

var test             = require('selenium-webdriver/testing'),
    config           = require('../../lib/config'),
    application_host = config.get_application_host(),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    moment           = require('moment'),
    login_user_func        = require('../../lib/login_with_user'),
    register_new_user_func = require('../../lib/register_new_user'),
    open_page_func         = require('../../lib/open_page'),
    submit_form_func       = require('../../lib/submit_form'),
    check_elements_func    = require('../../lib/check_elements'),
    check_booking_func     = require('../../lib/check_booking_on_calendar');


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for admin user
 *
 *  There was a bug when in newly created company user (when there is only one account)
 *  tried to create new leave request.
 *
 * */


describe('Leave request with singl user', function(){

  this.timeout( config.get_execution_timeout() );

  var new_user_email, driver;

  it('Create new company', function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function( data ){
      driver = data.driver;
      new_user_email = data.email;
      done();
    });
  });

  it("Open calendar page", function(done){
    open_page_func({
      url    : application_host + 'calendar/?show_full_year=1&year=2015',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Open page to create new leave", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){
        return el.click();
      })
      .then(function(){ done() });
  });

  it("Create new leave request", function(done){

    // This is very important line when working with Bootstrap modals!
    driver.sleep(1000);

    submit_form_func({
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
    })
    .then(function(){ done() });
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

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

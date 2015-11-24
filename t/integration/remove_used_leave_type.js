
'use strict';

var test             = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
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
    check_booking_func     = require('../lib/check_booking_on_calendar');


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new leave type (one tath is always at the start of list, e.g. AAA)
 *    - Create pended leave for that type
 *    - Try to remove the type
 *    - Ensure system prevent of doing this
 *
 * */


describe('Basic leave request', function(){

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(90000);

  test.it('Run', function(done){

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })

    // Open page with leave types
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/leavetypes/',
            driver : data.driver,
        });
    })

    // Add new leave type
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__new"]',
                value : 'AAAAA',
            },{
                selector : 'input[name="color__new"]',
                value : '121212',
            },{
                selector : 'input[name="use_allowance__new"]',
                value    : 'on',
                tick     : true,
            }],
            message : /Changes to leave types were saved/,
        });
    })

    // Open calendar page
    .then(function(data){
        return open_page_func({
            url    : application_host + 'calendar/?show_full_year=1',
            driver : data.driver,
        });
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

    // Open page with leave types
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/leavetypes/',
            driver : data.driver,
        });
    })

    // Try to remove newly added leave type
    // and ensure it fails
    .then(function(data){
         return submit_form_func({
            driver : data.driver,
            submit_button_selector : 'button[value="0"]',
            message : /Cannot remove leave type: type is in use/,
        });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  }); // End of test

});

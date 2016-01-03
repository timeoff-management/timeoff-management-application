
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
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for admin user
 *
 *  There was a bug when in newly created company user (when there is only one account)
 *  tried to create new leave request.
 *
 * */


describe('Basic leave request', function(){

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(90000);

  test.it('Run', function(done){

    var new_user_email;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })


    // Open calendar page
    .then(function(data){
        new_user_email = data.email;
        return open_page_func({
            url    : application_host + 'calendar/?show_full_year=1&year=2015',
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
                value           : "2",
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

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  }); // End of test

});

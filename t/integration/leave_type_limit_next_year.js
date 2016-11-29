

'use strict';

var test             = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    moment           = require('moment'),
    until            = require('selenium-webdriver').until,
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    check_elements_func    = require('../lib/check_elements'),
    check_booking_func     = require('../lib/check_booking_on_calendar'),
    add_new_user_func      = require('../lib/add_new_user'),
    leave_type_edit_form_id='#leave_type_edit_form';

var next_year = moment().add(1, 'y').format('YYYY');

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

  this.timeout(90000);

  test.it('Run', function(done){
    var admin_user_email, non_admin_user_email;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })

    // Open page with leave types
    .then(function(data){

      admin_user_email = data.email;

      return open_page_func({
        url    : application_host + 'settings/general/',
        driver : data.driver,
      });
    })

    // Check that it is possible to update Limits
    .then(function(data){
       return submit_form_func({
        driver      : data.driver,
        form_params : [{
          selector : leave_type_edit_form_id+' input[name="limit__0"]',
          value    : '1',
        }],
        submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
        should_be_successful : true,
        message : /Changes to leave types were saved/,
      });
    })

    // Create new non-admin user
    .then(function(data){
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Logout from admin account
    .then(function(data){

      non_admin_user_email = data.new_user_email;

      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as non-admin user
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : non_admin_user_email,
        driver           : data.driver,
      });
    })
    // Open calendar page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'calendar/?year='+next_year+'&show_full_year=1',
        driver : data.driver,
      });
    })
    // Add a request that fits under the limit
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })

        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          return submit_form_func({
            driver      : driver,
            form_params : [{
                selector : 'input#from',
                value : next_year + '-05-10',
            },{
                selector : 'input#to',
                value : next_year + '-05-10',
            }],
            message : /New leave request was added/,
          })
          // Check that all days are marked as pended
          .then(function(){
            return check_booking_func({
              driver    : driver,
              full_days : [moment(next_year + '-05-10')],
              type      : 'pended',
            });
          });
        });
    })

    // Logout from regular user session
    .then(function(data){
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as Admin
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : admin_user_email,
        driver           : data.driver,
      });
    })

    // Open requests page
    .then(function(data){
        return open_page_func({
            url    : application_host + 'requests/',
            driver : data.driver,
        });
    })
    // Approve newly added leave request
    .then(function(data){
      return data.driver.findElement(By.css(
        'tr[vpp="pending_for__'+non_admin_user_email+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })





    // Logout from admin account
    .then(function(data){
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Login as non-admin user
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : non_admin_user_email,
        driver           : data.driver,
      });
    })
    // Open calendar page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'calendar/?year='+ next_year +'&show_full_year=1',
        driver : data.driver,
      });
    })
    // And try to request one more day of the type already 100% taken
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })

        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          return submit_form_func({
            driver      : driver,
            form_params : [{
                selector : 'input#from',
                value : next_year + '-05-11',
            },{
                selector : 'input#to',
                value : next_year + '-05-11',
            }],
            message : /Failed to create a leave request/,
          });
        });
    })


    .then(function(){ done(); });

  }); // End of test

});

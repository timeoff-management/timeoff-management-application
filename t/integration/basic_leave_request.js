

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
    add_new_user_func      = require('../lib/add_new_user');


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for non admin user
 *    - Login as an admin user and approve leave request
 *    - Login as non admin user and check that new request is now
 *      shown as approved
 *
 * */

describe('Basic leave request', function(){

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(90000);

  test.it('Run', function(done){

    var non_admin_user_email, new_user_email;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    // Create new non-admin user
    .then(function(data){
        new_user_email = data.email;

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
            url    : application_host + 'calendar/?show_full_year=1',
            driver : data.driver,
        });
    })
    // And make sure that it is calendar indeed
    .then(function(data){
      data.driver.getTitle()
        .then(function(title){
            expect(title).to.be.equal('My calendar');
        });
      return Promise.resolve(data);
    })
    // Request new leave
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })

        // Following code is to ensure that non admin user can request leave only for
        // herself
        .then(function(){
          return driver.isElementPresent(By.css('select#employee'))
            .then(function(is_present){
              expect(is_present).to.be.equal(false);
            });
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
    // Logout from non-admin acount
    .then(function(data){
        return logout_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Login as admin user
    .then(function(data){
        return login_user_func({
            application_host : application_host,
            user_email       : new_user_email,
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
    // Make sure newly created request is shown for approval
    .then(function(data){
      return check_elements_func({
        driver : data.driver,
        elements_to_check : [{
          selector : 'div[vpp="pending_for__'+non_admin_user_email+'"] .btn-warning',
          value    : "Reject",
        }],
      });
    })
    // Approve newly added leave request
    .then(function(data){
      return data.driver.findElement(By.css(
        'div[vpp="pending_for__'+non_admin_user_email+'"] .btn-success'
      ))
      .then(function(el){ return el.click(); })
      .then(function(){
        // Wait until page properly is reloaded
        data.driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ return Promise.resolve(data); });
    })
    // Logout from admin acount
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
            url    : application_host + 'calendar/?show_full_year=1',
            driver : data.driver,
        });
    })
    // And make sure that it is calendar indeed
    .then(function(data){
      return data.driver.getTitle()

        .then(function(title){
            expect(title).to.be.equal('My calendar');
        })

        // Check that all days are marked as pended
        .then(function(){
          return check_booking_func({
            driver         : data.driver,
            full_days      : [moment('2015-06-16')],
            halfs_1st_days : [moment('2015-06-15')],
            type           : 'approved',
          });
        });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  }); // End of test

});

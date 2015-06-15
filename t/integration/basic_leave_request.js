

'use strict';

var test      = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    until = require('selenium-webdriver').until,
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    check_elements_func    = require('../lib/check_elements'),
    add_new_user_func      = require('../lib/add_new_user');


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user
 *    - Make sure that leve request is shown as a pending one for non admin user
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
    // Login with newly created admin user
    .then(function(data){
        new_user_email = data.email;

        return login_user_func({
            application_host : application_host,
            user_email       : new_user_email,
        });
    })
    // Create new non-admin user
    .then(function(data){
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Logout from admin acount
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
            url    : application_host + 'calendar/',
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
            form_params : [{
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
          return Promise.all([
            _.map([15, 16], function(day){
              return Promise.all([
                _.map(['half_1st','half_2nd'],function(half){
                  return driver.findElement(By.css('table.month_June td.day_'+day+'.'+half))
                    .then(function(el){ return el.getAttribute('class'); })
                    .then(function(css){
                      expect(css).to.match(/leave_cell_pended/);
                    })
                })
              ]);
            })
          ]);

        })

        .then(function(){ return Promise.resolve(data); });
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
            url    : application_host + 'calendar/',
            driver : data.driver,
        });
    })
    // And make sure that it is calendar indeed
    .then(function(data){
      data.driver.getTitle()
        .then(function(title){
            expect(title).to.be.equal('My calendar');
        })

        // Check that all days are marked as pended
        .then(function(){
          return Promise.all([
            _.map([15, 16], function(day){
              return Promise.all([
                _.map(['half_1st','half_2nd'],function(half){
                  return data.driver.findElement(By.css('table.month_June td.day_'+day+'.'+half))
                    .then(function(el){ return el.getAttribute('class'); })
                    .then(function(css){
                      expect(css).to.match(/leave_cell/);
                    })
                })
              ]);
            })
          ]);

        });
      return Promise.resolve(data);
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  }); // End of test

});

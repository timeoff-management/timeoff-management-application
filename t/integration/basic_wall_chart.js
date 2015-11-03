

'use strict';


var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  Promise                = require("bluebird"),
  until                  = require('selenium-webdriver').until,
  _                      = require('underscore'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  application_host       = 'http://localhost:3000/';

/*
 *  Scenario to check in thus test.
 *
 *    * Reigister new account for user A (supervisor and member of Sales department)
 *    * Create a new user B in Sales department
 *    * Open Wall chart page and make sure that both users are shown A and B
 *    * Create new department IT
 *    * Create new user C and make sure that he is a member and supervisor of IT department.
 *    * Login as B
 *    * Open Wall chart and make sure that it shows only two users A and B
 *     * Login as A
 *     * Open Wall chart and make sure that all three users are shown as A is admin
 *     * Update IT department to be supervised by user B
 *      * Login as B
 *    * Open Wall chart and make sure that it shows three users A, B, and C
 *    * Login with user C
 *    * Make sure that wall chart shows only user C
 *
 * */

  // Helper function to check that provided users (email) are shown on the Wall chart
  // page
  function check_wallchart(data, emails){


    return open_page_func({
        url    : application_host + 'calendar/wallchart/',
        driver : data.driver,
    })
    .then(function(data){
        return data.driver
            .findElements(By.css( 'table.team-view-users tr' ))
            .then(function(elements){
                // We have 2 rows for users and 1 for header
                expect(elements.length).to.be.equal( emails.length + 1 );

                return Promise.resolve(data);
            });
    });
  };


  describe('Check basic scenario for Wall chart page', function(){
    var driver;

    this.timeout(60000);

    test.it('Go...', function( done ){

        var user_A, user_B, user_C;

        // Performing registration process
        register_new_user_func({
            application_host : application_host,
        })

        // Login as user A
        .then(function(data){
            user_A = data.email;

            return login_user_func({
                application_host : application_host,
                user_email       : user_A,
            });
        })


        // Create new user B
        .then(function(data){
            return add_new_user_func({
                application_host : application_host,
                driver           : data.driver,
                // We have just one department so far
                department_index : "0",
            });
        })
        .then(function(data){
            user_B = data.new_user_email;
            return Promise.resolve(data);
        })

        // Make sure that both users are shown on Wall chart page
        .then(function(data){ return check_wallchart(data, [user_A, user_B]) })

        // Create new department: "IT"
        .then(function(data){
            return open_page_func({
                url    : application_host + 'settings/departments/',
                driver : data.driver,
            });
        })
        .then(function(data){
             return submit_form_func({
                driver      : data.driver,
                form_params : [{
                    selector : '#add_new_department_btn',
                    tick     : true,
                },{
                    selector : 'input[name="name__new"]',
                    value : 'IT',
                },{
                    selector        : 'select[name="allowence__new"]',
                    option_selector : 'option[value="10"]',
                    value : '10',
                }],
                message : /Changes to departments were saved/,
            });
        })


        // Create user C
        .then(function(data){
            return add_new_user_func({
                application_host : application_host,
                driver           : data.driver,
                // We know that departments are ordered alphabetically, so newly
                // added "ID" is before default "Sales" one
                department_index : "0",
            });
        })
        // Make sure user C is superviser of IT department
        .then(function(data){

            user_C = data.new_user_email;

            return open_page_func({
                url    : application_host + 'settings/departments/',
                driver : data.driver,
            });
        })
        .then(function(data){
             return submit_form_func({
                driver      : data.driver,
                form_params : [{
                    selector        : 'select[name="boss_id__0"]',
                    // because we have test names generated based on time, user C
                    // is going to be last in a drop down
                    option_selector : 'option:nth-child(3)',
                }],
                message : /Changes to departments were saved/,
            });
        })

        // Logout from A account
        .then(function(data){
            return logout_user_func({
                application_host : application_host,
                driver           : data.driver,
            });
        })
        // Login as user B
        .then(function(data){
            return login_user_func({
                application_host : application_host,
                user_email       : user_B,
                driver           : data.driver,
            });
        })

        // and make sure that only user A and B are presented
        .then(function(data){ return check_wallchart(data, [user_A, user_B]) })

        // Logout from B account
        .then(function(data){
            return logout_user_func({
                application_host : application_host,
                driver           : data.driver,
            });
        })
        // Login back as user A
        .then(function(data){
            return login_user_func({
                application_host : application_host,
                user_email       : user_A,
                driver           : data.driver,
            });
        })

        // and make sure that all users are shown:  A, B, and C
        .then(function(data){ return check_wallchart(data, [user_A, user_B, user_C]) })

        // Update IT department to be supervised by user B
        .then(function(data){
            return open_page_func({
                url    : application_host + 'settings/departments/',
                driver : data.driver,
            });
        })
        .then(function(data){
             return submit_form_func({
                driver      : data.driver,
                form_params : [{
                    selector        : 'select[name="boss_id__0"]',
                    // because we have test names generated based on time, user B
                    // is going to be second one in a drop down as it was added before
                    // all other ones
                    option_selector : 'option:nth-child(2)',
                }],
                message : /Changes to departments were saved/,
            });
        })

        // Logout from A account
        .then(function(data){
            return logout_user_func({
                application_host : application_host,
                driver           : data.driver,
            });
        })
        // Login as user B
        .then(function(data){
            return login_user_func({
                application_host : application_host,
                user_email       : user_B,
                driver           : data.driver,
            });
        })

        // and make sure that all users are shown:  A, B, and C
        .then(function(data){ return check_wallchart(data, [user_A, user_B, user_C]) })

        // Logout from admin account
        .then(function(data){
            return logout_user_func({
                application_host : application_host,
                driver           : data.driver,
            });
        })
        // Login as user C
        .then(function(data){
            return login_user_func({
                application_host : application_host,
                user_email       : user_C,
                driver           : data.driver,
            });
        })

        // and make sure that only one user C is here
        .then(function(data){ return check_wallchart(data, [user_C]) })

        // Close the browser
        .then(function(data){
            data.driver.quit().then(function(){ done(); });
        });

    });

  });

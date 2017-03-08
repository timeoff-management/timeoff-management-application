
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
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  config                 = require('../lib/config'),
  new_department_form_id = '#add_new_department_form',
  application_host       = config.get_application_host(),
  company_edit_form_id   ='#company_edit_form';

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (supervisor and member of Sales department)
 *    * Create a new user B in Sales department
 *    * Open Team view page and make sure that both users are shown A and B
 *    * Create new department IT
 *    * Create new user C and make sure that he is a member and supervisor of IT department.
 *    * Login as B
 *    * Open Team view and make sure that it shows only two users A and B
 *     * Login as A
 *     * Open Team view and make sure that all three users are shown as A is admin
 *     * Update IT department to be supervised by user B
 *      * Login as B
 *    * Open Team view and make sure that it shows three users A, B, and C
 *    * Login with user C
 *    * Make sure that Team view page shows only user C
 *
 *    * Login as admin user A
 *    * Update company settings to have share_all_absences be TRUE
 *    * Login with user C
 *    * Make sure that Team view page shows all users from within company
 *
 * */

  // Helper function to check that provided users (email) are shown on the Team view
  // page
  function check_teamview(data, emails){

    return open_page_func({
      url    : application_host + 'calendar/teamview/',
      driver : data.driver,
    })
    .then(function(data){
      var promise_to_check = data.driver
        .findElements(By.css( 'tr.teamview-user-list-row > td' ))

        // Make sure that number of users is as expected
        .then(function(elements){

          expect(elements.length).to.be.equal( emails.length );

          return Promise.all(_.map(elements, function(el){ return el.getText();  }));
        })

        // Make sure that users are actually those as expected
        .then(function(full_names){

          // The idea is to extract unique tokens from provided emails
          var tokens_from_emails = _.map(emails, function(email){
            return email.substring(0, email.lastIndexOf("@"));
          }).sort();

          // ... extract unique tokens from full names on the page
          var tokens_from_name = _.map(full_names, function(name){
            return name.substring(4, name.lastIndexOf(" "));
          }).sort();

          // ... and make sure that they are matched
          expect( tokens_from_emails ).to.be.eql(tokens_from_name);

          return Promise.resolve(data);
        });

      return promise_to_check;
    });
  };

  describe('Check basic scenario for Team view page', function(){
    var driver;

    this.timeout(60000);

    test.it('Go...', function( done ){

        var user_A, user_B, user_C;

        // Performing registration process
        register_new_user_func({
            application_host : application_host,
        })


        // Create new user B
        .then(function(data){

            user_A = data.email;

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

        // Make sure that both users are shown on Team view page
        .then(function(data){ return check_teamview(data, [user_A, user_B]) })

        // Create new department: "IT"
        .then(function(data){
            return open_page_func({
                url    : application_host + 'settings/departments/',
                driver : data.driver,
            });
        })
        .then(function(data){

          return data.driver.findElement(By.css('#add_new_department_btn'))
            .then(function(el){
              return el.click();
            })
            .then(function(){

             // This is very important line when working with Bootstrap modals!
             data.driver.sleep(1000);

             return submit_form_func({
                driver      : data.driver,
                form_params : [{
                    selector : new_department_form_id+' input[name="name__new"]',
                    value : 'IT',
                },{
                    selector        : new_department_form_id+' select[name="allowence__new"]',
                    option_selector : 'option[value="10"]',
                    value : '10',
                }],
                submit_button_selector : new_department_form_id+' button[type="submit"]',
                message : /Changes to departments were saved/,
              });
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
        .then(function(data){ return check_teamview(data, [user_A, user_B]) })

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
        .then(function(data){ return check_teamview(data, [user_A, user_B, user_C]) })

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
        .then(function(data){ return check_teamview(data, [user_A, user_B, user_C]) })

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
        .then(function(data){ return check_teamview(data, [user_C]) })

        // Logout from user C account
        .then(function(data){
            return logout_user_func({
                application_host : application_host,
                driver           : data.driver,
            });
        })

        // Login as user A
        .then(function(data){
            return login_user_func({
                application_host : application_host,
                user_email       : user_A,
                driver           : data.driver,
            });
        })

        // Open page for editing company details
        .then(function(data){
            return open_page_func({
                url    : application_host + 'settings/general/',
                driver : data.driver,
            });
        })

        // Check that company is been updated if valid values are submitted
        .then(function(data){
            return submit_form_func({
                driver      : data.driver,
                form_params : [{
                    selector : company_edit_form_id+' input[name="share_all_absences"]',
                    tick     : true,
                    value    : 'on',
                }],
                submit_button_selector : company_edit_form_id+' button[type="submit"]',
                message : /successfully/i,
                should_be_successful : true,
            });
        })

        // Logout from user A account
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

        // and make sure that all users are shown on Team view page
        .then(function(data){ return check_teamview(data, [user_A, user_B, user_C]) })

        // Close the browser
        .then(function(data){
            data.driver.quit().then(function(){ done(); });
        });

    });

  });

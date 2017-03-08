
'use strict';


var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  Promise                = require("bluebird"),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  add_new_user_func      = require('../lib/add_new_user'),
  logout_user_func       = require('../lib/logout_user'),
  check_teamview_func    = require('../lib/teamview_check_user'),
  config           = require('../lib/config'),
  application_host = config.get_application_host();

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (admin)
 *    * Create a new user B (non admin)
 *    * Open Team view page and make sure that both users are as links to Employee details page
 *    * Login as B
 *    * Open Team view and make sure that it shows both users as plain text
 *
 * */

  describe('Cross linking on Teamview page', function(){
    var driver;

    this.timeout(60000);

    test.it('Go...', function( done ){

      var user_A, user_B;

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
        });
      })
      .then(function(data){
        user_B = data.new_user_email;
        return Promise.resolve(data);
      })

      // Make sure that both users are shown on Team view page
      .then(function(data){
        return check_teamview_func({
          driver: data.driver,
          emails: [user_A, user_B],
          is_link : true
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
      .then(function(data){
        return check_teamview_func({
          driver: data.driver,
          emails: [user_A, user_B],
          is_link: false
        });
      })

      // Close the browser
      .then(function(data){
        data.driver.quit().then(function(){ done(); });
      });

    });

  });

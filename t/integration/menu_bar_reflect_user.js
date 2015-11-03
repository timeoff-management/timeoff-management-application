
'use strict';


var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  add_new_user_func      = require('../lib/add_new_user'),
  By                     = require('selenium-webdriver').By,
  bluebird               = require("bluebird"),
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  logout_user_func       = require('../lib/logout_user'),
  application_host       = 'http://localhost:3000/';

/*
 *  Scenario to check in thus test.
 *
 *  * Create new account
 *  * Login into system
 *  * Check that all admin links are available on the menu bar
 *  * Create non admin user
 *  * Login with non-admin user
 *  * Make sure that only limited set of links are available
 *  * Admon features are not available
 *
 * */

describe('Menu bar reflect permissions of logged in user', function(){

  this.timeout(90000);

  test.it('Go...', function(done){

    var ordinary_user_email;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    // Login with newly created admin user
    .then(function(data){

        return login_user_func({
            application_host : application_host,
            user_email       : data.email,
        });
    })

    .then(function(data){
      var promises_to_check =  check_presense_promises({
        driver    : data.driver,
        presense  : true,
        selectors : [
          'li > a[href="/calendar/"]',
          'li > a[href="/calendar/teamview/"]',
          'li > a[href="/calendar/feeds/"]',
          'li > a[href="/users/"]',
          'li > a[href="/settings/company/"]',
          'li > a[href="/settings/departments/"]',
          'li > a[href="/settings/bankholidays/"]',
          'li > a[href="/settings/leavetypes/"]',
          'li > a[href="/requests/"]',
          'li > a[href="/logout/"]',
        ],
      });

      return bluebird.all( promises_to_check)
        .then( function(){ return bluebird.resolve(data) });
    })

    // Create non-admin user
    .then(function(data){
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Logout from admin acount
    .then(function(data){
        ordinary_user_email = data.new_user_email;
        return logout_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Login as ordinary user
    .then(function(data){
        return login_user_func({
            application_host : application_host,
            user_email       : ordinary_user_email,
            driver           : data.driver,
        });
    })
    // Check that limited links are there
    .then(function(data){
      var promises_to_check =  check_presense_promises({
        driver    : data.driver,
        presense  : true,
        selectors : [
          'li > a[href="/calendar/"]',
          'li > a[href="/calendar/teamview/"]',
          'li > a[href="/calendar/feeds/"]',
          'li > a[href="/requests/"]',
          'li > a[href="/logout/"]',
        ],
      });

      return bluebird.all( promises_to_check)
        .then( function(){ return bluebird.resolve(data) });
    })
    // Check that admin links are not shown
    .then(function(data){
      var promises_to_check =  check_presense_promises({
        driver    : data.driver,
        presense  : false,
        selectors : [
          'li > a[href="/users/"]',
          'li > a[href="/settings/company/"]',
          'li > a[href="/settings/departments/"]',
          'li > a[href="/settings/bankholidays/"]',
          'li > a[href="/settings/leavetypes/"]',
        ],
      });

      return bluebird.all( promises_to_check)
        .then( function(){ return bluebird.resolve(data) });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });
  });

});

function check_presense_promises(args){

  var selectors = args.selectors,
      driver    = args.driver,
      presense  = args.presense || false;

  var promises_to_check = _.map(
   selectors,
    function( selector ){
      return driver
        .isElementPresent(By.css(selector))
        .then(function(is_present){
          expect(is_present).to.be.equal(presense);
          return bluebird.resolve();
        })
    }
  );

  return promises_to_check;
};

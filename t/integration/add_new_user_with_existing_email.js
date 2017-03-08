
'use strict';


var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  add_new_user_func      = require('../lib/add_new_user'),
  config                 = require('../lib/config'),
  application_host       = config.get_application_host();

/*
 *  Scenario to check in this test:
 *
 *  * Create an account and get a note of email
 *  * Try to add user with the same email
 *
 * */

describe('Admin tries to add user with email used for other one', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var new_user_email;

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
            email            : new_user_email,
            error_message    : 'Email is already in use',
        });
    })
    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });
  });

});

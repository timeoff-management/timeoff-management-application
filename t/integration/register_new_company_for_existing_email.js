
'use strict';

var test             = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    add_new_user_func      = require('../lib/add_new_user');

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * make sure we are not login
    * try create new acount for the same email as used in first step
    * System should report that such email address could not be used
      and suggest using forget password feature.

*/

describe('Reuse email from existing acount when creating new company', function(){

  this.timeout(90000);

  test.it('Go', function(done){

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    // Login with newly created admin user
    .then(function(data){
        var admin_email = data.email;

        return login_user_func({
            application_host : application_host,
            user_email       : admin_email,
        });
    })
    // Close browser;
    .then(function(data){
        data.driver.quit().then(function(){ done(); });
    });


  });

});

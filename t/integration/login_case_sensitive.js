
'use strict';

var test             = require('selenium-webdriver/testing'),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    config                 = require('../lib/config'),
    application_host       = config.get_application_host();

/*
  User emails are case insensitive.

  Scenario to check:
    * create new account with email containing capital letters
    * logout
    * try to login with same email typed in lower case letters

*/

describe('Emails are case insensitive', function(){

  this.timeout( config.get_execution_timeout() );

  test.it('Go', function(done){

    var admin_email;

    // Register an account useing upper case letters
    return register_new_user_func({
        application_host : application_host,
        user_email : (new Date()).getTime() + 'John.Smith@TEST.com',
    })
    .then(function(data){
      admin_email = data.email;

      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Try to login with lower case email
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : admin_email.toLowerCase(),
        driver           : data.driver,
      });
    })

    .then(function(data){
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Try to login with upper case email
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : admin_email.toUpperCase(),
        driver           : data.driver,
      });
    })

    // Close browser;
    .then(function(data){
      done();
    });

  });

});

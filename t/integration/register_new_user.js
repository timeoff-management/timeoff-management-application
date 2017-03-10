
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  logout_user_func       = require('../lib/logout_user'),
  config                 = require('../lib/config'),
  application_host       = config.get_application_host();


describe('Register new user', function(){
  var driver;

  this.timeout( config.get_execution_timeout() );

  test.it('Check default registration path', function(done){

    // Performing registration process
    register_new_user_func({
      application_host : application_host,
    })

    .then(function(data){

      // Logout user
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });

    })

    .then(function(data){

      // Close browser;
      data.driver.quit().then(function(){ done(); });
    });

  });
});


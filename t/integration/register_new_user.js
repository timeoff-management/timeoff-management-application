
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  logout_user_func       = require('../lib/logout_user'),
  application_host       = 'http://localhost:3000/';


describe('Register new user', function(){
  var driver;

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(50000);

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


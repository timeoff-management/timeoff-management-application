
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  application_host       = 'http://localhost:3000/',
  new_user_email;


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
      new_user_email = data.email;

      // Checking that new user can login
      return login_user_func({
        application_host : application_host,
        user_email       : new_user_email,
      });

    })

    .then(function(data){

        return open_page_func({
            url    : application_host + 'settings/company',
            driver : data.driver,
        });

    })

    .then(function(data){

        return submit_form_func({
            driver : data.driver,
        });

    })



    .then(function(data){

      // Close browser;
      data.driver.quit().then(function(){ done(); });
    });

  });
});



'use strict';

var test             = require('selenium-webdriver/testing'),
    config           = require('../lib/config'),
    application_host = config.get_application_host(),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
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

    var admin_email;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    .then(function(data){
      console.log('    Logout from newly created account '+admin_email);
      admin_email = data.email;

      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    .then(function(data){
        data.driver.quit().then(function(){ done(); });
        return Promise.resolve(1);
    })
    .then(function(){
        console.log('    Try to create another account with the same email '
          + admin_email);

        return register_new_user_func({
          application_host      : application_host,
          user_email            : admin_email,
          failing_error_message : 'Failed to register user please contact customer service. Error: Email is already used',
        });
    })

    // Close browser;
    .then(function(data){
      done();
    });


  });

//  after(function() {
//    if (this.currentTest.state == 'failed') {
//      driver.takeScreenshot().then(function(image, err) {
//        return require('fs').writeFile('out.png', image, 'base64', function(err) {
//            console.log(err);
//        });
//      })
//      .close();
//
//
//    }
//  });

});

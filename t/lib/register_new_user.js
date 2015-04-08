/*

*/

'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    uuid      = require('node-uuid'),
    Promise   = require("bluebird"),
    driver;


module.exports = Promise.promisify( function(args, callback){

  var application_host = args.application_host,
      new_user_email = uuid.v4() + '@test.com';

  // Instantiate new driver object
    driver = new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build();

  // Go to front page
  driver.get( application_host );

  // Check if there is a registration link
  driver.findElement( By.css('a[href="/register/"]') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Sign up');
    });


  // Click on registration link
  driver
    .findElement(By.css('a[href="/register/"]'))
    .then(function(el){
      el.click();
    });

  // Make sure that new page is a registration page
  driver.findElement(By.css('h1'))
    .then(function(el){
      return el.getText();
    })
    .then(function(ee){
      expect(ee).to.be.equal('Register new user');
    });
  // TODO check title when it is implemented
//  driver.getTitle()
//    .then(function(title) {
//      expect(title).to.be.equal('Please enter your details');
//    });

  // Fill in all text fields
  Promise.all([
    _.map(
      [
        {
          selector : 'input[name="name"]',
          value    : 'Name of ' + new_user_email,
        },
        {
          selector : 'input[name="lastname"]',
          value    : 'Last name of ' + new_user_email,
        },
        {
          selector : 'input[name="email"]',
          value    : new_user_email,
        },
        {
          selector : 'input[name="password"]',
          value    : '123456',
        },
        {
          selector : 'input[name="password_confirmed"]',
          value    : '123456',
        },
      ],
      function( test_case ){
        driver
          .findElement(By.css( test_case.selector ))
          .then(function(el){
            el.sendKeys( test_case.value );
          });
      })
  ]);

  // Submit registration form
  driver
    .findElement(
      By.css('#submit_registration')
    )
    .then(function(el){
      el.click();
    });

  // Make sure registration completed successfully
  driver
    .findElement(
      By.css('div.alert-success')
    )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Registration is complete. You can login to the system');
    });

  // Close the driver and pass data back to the caller
  driver
    .quit()
    .then(function(){
       callback(
        null,
        {
          email : new_user_email,
        }
      );
    });

});


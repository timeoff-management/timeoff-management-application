/*

*/

'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    until     = require('selenium-webdriver').until,
    expect    = require('chai').expect,
    _         = require('underscore'),
    uuid      = require('node-uuid'),
    Promise   = require("bluebird"),
    driver;


module.exports = Promise.promisify( function(args, callback){

  var application_host = args.application_host,
      failing_error_message = args.failing_error_message,
      random_token =  (new Date()).getTime(),
      new_user_email = args.user_email || random_token + '@test.com';

  // Instantiate new driver object
    driver = new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.phantomjs())
//      .withCapabilities(webdriver.Capabilities.chrome())
      .build();

  // Make sure we are in desktop version
  driver.manage().window().setSize(1024, 768);

  // Go to front page
  driver.get( application_host );

  driver.wait(until.elementLocated(By.css('h1')), 1000);

  // Check if there is a registration link
  driver.findElement( By.css('a[href="/register/"]') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.match(/Register new company/i);
    });


  // Click on registration link
  driver
    .findElement(By.css('a[href="/register/"]'))
    .then(function(el){
      el.click();
    });

  driver.wait(until.elementLocated(By.css('h1')), 1000);

  // Make sure that new page is a registration page
  driver.findElement(By.css('h1'))
    .then(function(el){
      return el.getText();
    })
    .then(function(ee){
      expect(ee).to.be.equal('New company');
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
          selector : 'input[name="company_name"]',
          value    : 'Company '+(new Date()).getTime(),
        },
        {
          selector : 'input[name="name"]',
          value    : 'name' + random_token,
        },
        {
          selector : 'input[name="lastname"]',
          value    : 'lastname' + random_token,
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
        {
          selector        : 'select[name="country"]',
          option_selector : 'option[value="IS"]',
          value           : 'IS',
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

  driver.wait(until.elementLocated(By.css('div')), 1000);

  if (failing_error_message) {

    driver
      .findElement(
        By.css('div.alert-danger')
      )
      .then(function(el){
        return el.getText();
      })
      .then(function(text){
        expect(text).to.be.equal(failing_error_message);
      });

  } else {

    // Make sure registration completed successfully
    driver
      .findElement(
        By.css('div.alert-success')
      )
      .then(function(el){
        return el.getText();
      })
      .then(function(text){
        expect(text).to.be.equal('Registration is complete.');
      });

  }

  // Pass data back to the caller
  driver.get( application_host )
    .then(function(){
       callback(
        null,
        {
          driver : driver,
          email : new_user_email,
        }
      );
    });

});


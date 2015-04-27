
'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    driver;


module.exports = Promise.promisify(function(args, callback){

  var application_host = args.application_host,
      user_email       = args.user_email,
      result_callback  = callback,

  // Create new instance of driver
  driver = args.driver || new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  // Open front page
  driver.get( application_host );

  // Check that there is a login button
  driver.findElement( By.css('a[href="/login/"]') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Login');
    });

  // Click on Login button
  driver.findElement( By.css('a[href="/login/"]') )
    .then(function(el){
      return el.click();
    });

  // Check that it is actually login page
  driver.findElement( By.css('h1') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Login');
    });

  // Fill login form
  Promise.all([
    _.map(
      [
        {
          selector : 'input[name="username"]',
          value    : user_email,
        },
        {
          selector : 'input[name="password"]',
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

  // Submit login button
  driver.findElement( By.css('#submit_login') )
    .then(function(el){
      el.click();
    });

  // Make sure login was successful, check that we landed on user account page
  driver
    .findElement( By.css('h1') )
    .then(function(el){ return el.getText(); })
    .then(function(text){
      expect(text).to.be.equal('Dashboard');
    });

  driver.getTitle()
    .then(function(title){
        expect(title).to.be.equal('Dashboard');
    });

  driver
    .findElement(
      By.css('div.alert-success')
    )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.match(/Welcome back/);
    });


  // Go back to the front page and pass data to the caller
  driver.get( application_host )
    .then(function(){
      // "export" current driver
      result_callback(
        null,
        {
          driver : driver,
        }
      );
    });
});



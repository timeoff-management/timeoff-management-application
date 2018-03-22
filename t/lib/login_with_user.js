
'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    until     = require('selenium-webdriver').until,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    driver;


var login_with_user_func = Promise.promisify(function(args, callback){

  var application_host = args.application_host,
      user_email       = args.user_email,
      result_callback  = callback,
      password         = args.password || '123456',
      should_fail      = args.should_fail || false,

  // Create new instance of driver
  driver = args.driver || new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.phantomjs())
//    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  // Make sure we are in desktop version
  driver.manage().window().setSize(1024, 768);

  // Open front page
  driver.get( application_host );

  driver.wait(until.elementLocated(By.css('h1')), 1000);

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

  driver.wait(until.elementLocated(By.css('h1')), 1000);

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
          value    : password,
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

  if (should_fail) {

    driver
      .findElement(
        By.css('div.alert-danger')
      )
      .then(function(el){
        return el.getText();
      })
      .then(function(text){
        expect(text).to.match(/Incorrect credentials/);
      });

  } else {
    driver.wait(until.elementLocated(By.css('div.alert-success')), 1000);

    // Make sure login was successful, check that we landed on user account page
    driver.getTitle()
      .then(function(title){
          expect(title).to.be.equal('Calendar');
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
  }


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

module.exports = function(args){
  return args.driver.call(function(){return login_with_user_func(args)});
}

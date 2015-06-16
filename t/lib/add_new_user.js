
'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    uuid      = require('node-uuid'),
    submit_form_func = require('../lib/submit_form'),
    driver;


module.exports = Promise.promisify(function(args, callback){

  var application_host = args.application_host,
      result_callback  = callback,

  driver = args.driver || new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  var new_user_email = (new Date()).getTime() + '@test.com';

  // Open front page
  driver.get( application_host );

  driver.findElement( By.css('a[href="/users/"]') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Staff');
    });

  driver.findElement( By.css('a[href="/users/"]') )
    .then(function(el){
      return el.click();
    });

  driver.findElement( By.css('#add_new_department_btn') )
    .then(function(el){
      return el.click();
    })
    .then(function(){
      return submit_form_func({
          driver      : driver,
          form_params : [{
              selector : 'input[name="name"]',
              value    : 'test name',
          },{
              selector : 'input[name="lastname"]',
              value    : 'lastname '+new_user_email.substring(0,new_user_email.lastIndexOf('@')),
          },{
              selector : 'input[name="email"]',
              value    : new_user_email,
          }],
          should_be_successful : true,
          elements_to_check : [],
          message : /New user account successfully added/,
      });
    })

    .then(function(){
      // "export"
      result_callback(
        null,
        {
          driver         : driver,
          new_user_email : new_user_email,
        }
      );
    });
});



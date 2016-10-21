
'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    until     = require('selenium-webdriver').until,
    Promise   = require("bluebird"),
    uuid      = require('node-uuid'),
    submit_form_func = require('../lib/submit_form'),
    add_new_user_form_id = '#add_new_user_form',
    driver;


module.exports = Promise.promisify(function(args, callback){

  var application_host = args.application_host,
      result_callback  = callback,
      department_index  = args.department_index,
      // optional parameter, if provided the user adding action is expected to fail
      // with that error
      error_message = args.error_message,

  driver = args.driver || new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.phantomjs())
    .build();

  var random_token =  (new Date()).getTime();
  var new_user_email = args.email || random_token + '@test.com';

  // Open front page
  driver.get( application_host );

  driver.findElement( By.css('a[href="/users/"]') )
    .then(function(el){
      return el.getText();
    })
    .then(function(text){
      expect(text).to.be.equal('Employees');
    });

  driver.findElement( By.css('a[href="/users/"]') )
    .then(function(el){
      return el.click();
    });

  driver.wait(until.elementLocated(By.css('#add_new_department')), 1000);

  driver.findElement( By.css('#add_new_department') )
    .then(function(el){
      return el.click();
    })
    .then(function(){

      driver.wait(until.elementLocated(By.css('input[name="name"]')), 1000);

      var select_department = {};
      if (typeof department_index !== 'undefined') {

        select_department = {
            selector        : 'select[name="department"]',
            option_selector : 'option[value="'+department_index+'"]',
        };
      }

      return submit_form_func({
          driver      : driver,
          form_params : [{
              selector : add_new_user_form_id+' input[name="name"]',
              value    : 'name'+random_token,
          },{
              selector : add_new_user_form_id+' input[name="lastname"]',
              value    : 'lastname'+random_token,
          },{
              selector : add_new_user_form_id+' input[name="email"]',
              value    : new_user_email,
          },{
              selector : add_new_user_form_id+' input[name="password"]',
              value    : '123456',
          },{
              selector : add_new_user_form_id+' input[name="password_confirm"]',
              value    : '123456',
          },{
              selector : add_new_user_form_id+' input[name="start_date"]',
              value : '2015-06-01',
          },
              select_department,
          ],
          submit_button_selector : add_new_user_form_id+' button[type="submit"]',
          should_be_successful : error_message ? false : true,
          elements_to_check : [],
          message : error_message ?
            new RegExp(error_message) :
            /New user account successfully added/,
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



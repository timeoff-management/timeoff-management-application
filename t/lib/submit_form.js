'use strict';

var webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird");


module.exports = Promise.promisify( function(args, callback){

  var application_host = args.application_host,
      driver           = args.driver,
      result_callback  = callback,
      form_params      = args.form_params || [];


  Promise.all([
    _.map(
      form_params,
      function( test_case ){
        driver
          .findElement(By.css( test_case.selector ))
          .then(function(el){
            el.sendKeys( test_case.value );
          });
      })
  ]);


  // Submit 
  driver
    .findElement(
      By.css('button[type="submit"]')
    )
    .then(function(el){
      el.click();
    })


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


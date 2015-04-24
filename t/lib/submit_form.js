'use strict';

var webdriver  = require('selenium-webdriver'),
By             = require('selenium-webdriver').By,
expect         = require('chai').expect,
_              = require('underscore'),
Promise        = require("bluebird"),
check_elements = require('./check_elements');


module.exports = Promise.promisify( function(args, callback){

  var driver          = args.driver,
      result_callback = callback,
      // Regex to check the message that is shown after form is submitted
      message         = args.message || /.*/,
      // Array of object that have at least two keys: selector - css selector
      // and value - value to be entered
      form_params     = args.form_params || [],

      // Defined how elemts are going to be checked in case of success,
      // if that parameter is omitted - 'form_params' is used instead
      elements_to_check   = args.elements_to_check || form_params,

      // Indicates whether form submission is going to be successful
      should_be_successful = args.should_be_successful || false;


    // Enter form parameters
    Promise.all([
        _.map(
            form_params,
            function( test_case ){
                driver
                .findElement(By.css( test_case.selector ))
                .then(function(el){
                    if ( test_case.hasOwnProperty('option_selector') ) {
                        el.click();
                        return el.findElement(By.css( test_case.option_selector ))
                          .then(function(el){ return el.click(); });
                    } else if ( test_case.hasOwnProperty('tick')) {
                        return el.click();
                    } else {
                        return el.clear().then(function(){
                            el.sendKeys( test_case.value );
                        });
                    }
                });
            })
    ]);


    // Submit the form
    driver
        .findElement( By.css('button[type="submit"]') )
        .then(function(el){
            el.click();
        });

    if ( should_be_successful ) {

        Promise.resolve(
            check_elements({
                driver : driver,
                elements_to_check : elements_to_check,
            })
            .then(function(data){
                driver = data.driver;
            })
        );

    }

    // Check that message is as expected
    driver
        .findElement( By.css('div.alert') )
        .then(function(el){
            return el.getText();
        })

        .then(function(text){
            expect(text).to.match(message);

            // "export" current driver
            result_callback(
                null,
                {
                    driver : driver,
                }
            );
        });
});


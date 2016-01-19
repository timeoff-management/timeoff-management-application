'use strict';

var webdriver  = require('selenium-webdriver'),
By             = require('selenium-webdriver').By,
expect         = require('chai').expect,
_              = require('underscore'),
Promise        = require("bluebird"),
until          = require('selenium-webdriver').until,
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
      should_be_successful = args.should_be_successful || false,

      // Indicate if message to be searched through all messages shown,
      // bu defaul it looks into firts message only
      multi_line_message = args.multi_line_message || false,

      // CSS selecetor for form submition button
      submit_button_selector = args.submit_button_selector ||'button[type="submit"]';


    // Enter form parameters
    Promise.all([
        _.map(
            form_params,
            function( test_case ){

                // Handle case when test case is empty
                if (Object.keys(test_case).length === 0 ){
                    return Promise.resolve(1);
                }

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
        .findElement( By.css( submit_button_selector ) )
        .then(function(el){
            el.click();

            driver.wait(until.elementLocated(By.css('title')), 1000);
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
    if (multi_line_message) {
      driver.findElements( By.css('div.alert') )
        .then(function(els){

          return Promise.all(
            _.map(els, function(el){ return el.getText(); })
          )
          .then(function(texts){
            expect(
              _.any(texts, function(text){ return message.test(text); })
            ).to.be.equal(true);

            // "export" current driver
            result_callback(
                null,
                {
                    driver : driver,
                }
            );
          });
        });

    } else {

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
    }
});


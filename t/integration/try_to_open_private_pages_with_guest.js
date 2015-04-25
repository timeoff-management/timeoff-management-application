
'use strict';

var test           = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    new_user_email,
    webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user');



describe('Try to access private pages with guest user', function(){

    // The app is really slow and does not manage to handle request in
    // default 2 seconds, so be more patient.
    this.timeout(50000);

    test.it('Check pages', function(done) {


        Promise.all(_.map(
          // Add more URLs to check into the array below
          [
              'logout/', 'settings/company/', 'settings/departments/',
              'settings/bankholidays/', 'settings/leavetypes/'
          ],
          function(path) {

              var driver = new webdriver.Builder()
                  .withCapabilities(webdriver.Capabilities.chrome())
                  .build();

              // Open front page
              driver.get( application_host + path);
              driver.getCurrentUrl()
                  .then(function(url){
                      expect(url).to.be.equal(application_host);
                  });
              return driver.quit();
          }))
          .then(function(){ done(); });
    });

    test.it('Check main (dashboard) page', function(done) {

        var driver = new webdriver.Builder()
            .withCapabilities(webdriver.Capabilities.chrome())
            .build();

        // Open front page
        driver.get( application_host);
        driver.getTitle()
            .then(function(title){
                expect(title).to.be.equal('Time off management');
            });
        driver.quit().then(function(){ done(); });
    });

});


describe.skip('Try to access admin pages with non-admin user', function(){
    this.timeout(50000);

    test.it('Check pages', function(done) {


        Promise.all(_.map(
            [
              'settings/company/', 'settings/departments/',
              'settings/bankholidays/', 'settings/leavetypes/'
            ],
            function(path) {

                return register_new_user_func({
                    application_host : application_host,
                })
                .then(function(data){
                    new_user_email = data.email;

                    return login_user_func({
                        application_host : application_host,
                        user_email       : new_user_email,
                    });

                    // TODO: add new non-admin user and logon with it
                })
                .then(function(data){

                    console.error('>>> going through ' + path);
                    var driver = data.driver;

                    driver.get( application_host + path);
                    driver.getCurrentUrl()
                      .then(function(url){
                          expect(url).to.be.equal(application_host);
                      });
                    return driver.quit();
                });
             }
        )) // end of map and Promise.all
        .then(function(){ done(); });
    });
 
});

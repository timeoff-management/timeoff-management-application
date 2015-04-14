
'use strict';

var test           = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    new_user_email,
    webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird");



describe('Try to access private pages with guest user', function(){

    // The app is really slow and does not manage to handle request in
    // default 2 seconds, so be more patient.
    this.timeout(50000);

    test.it('Check logout page', function(done) {


        Promise.all(_.map(
          // Add more URLs to check into the array below
          ['logout/', 'settings/company/'],
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

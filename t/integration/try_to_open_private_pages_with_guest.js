
'use strict';

var test           = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    new_user_email,
    webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect;



describe('Try to access private pages with guest user', function(){

    test.it('Check logout page', function(done) {

        // Create new instance of driver
        var driver = new webdriver.Builder()
            .withCapabilities(webdriver.Capabilities.chrome())
            .build();

        // Open front page
        driver.get( application_host + 'logout/');
        driver.getCurrentUrl()
            .then(function(url){
                expect(url).to.be.equal(application_host);
            });
        driver.quit().then(function(){ done(); });
    });


});

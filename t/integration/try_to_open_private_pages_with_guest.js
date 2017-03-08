
'use strict';

var test           = require('selenium-webdriver/testing'),
    config           = require('../lib/config'),
    application_host = config.get_application_host(),
    webdriver = require('selenium-webdriver'),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    until     = require('selenium-webdriver').until,
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    add_new_user_func      = require('../lib/add_new_user');


describe('Try to access private pages with guest user', function(){

    // The app is really slow and does not manage to handle request in
    // default 2 seconds, so be more patient.
    this.timeout(90000);

    test.it('Check pages', function(done) {


        Promise.all(_.map(
          // Add more URLs to check into the array below
          [
            'logout/', 'settings/general/', 'settings/departments/'
          ],
          function(path) {

              var driver = new webdriver.Builder()
                  .withCapabilities(webdriver.Capabilities.phantomjs())
                  .build();

              // Open front page
              driver.get( application_host + path);
              driver.getCurrentUrl()
                  .then(function(url){
                      expect(url).to.be.equal(application_host+'login/');
                  });
              return driver.quit();
          }))
          .then(function(){ done(); });
    });

    test.it('Check main (dashboard) page', function(done) {

        var driver = new webdriver.Builder()
            .withCapabilities(webdriver.Capabilities.phantomjs())
            .build();

        // Open front page
        driver.get( application_host);
        driver.getTitle()
            .then(function(title){
                expect(title).to.be.equal('Time Off Management');
            });
        driver.quit().then(function(){ done(); });
    });

});


describe('Try to access admin pages with non-admin user', function(){
  this.timeout(90000);

  test.it('Check pages', function(done) {

    var non_admin_user_email;

    var check_pathes = function(driver, reachable){

      var admin_pages =  [
        'users/add/',
        'users/',
        'settings/general/', 'settings/departments/',
      ];

      return Promise.each(admin_pages, function(path){
        driver.get( application_host + path);
        driver.wait(until.elementLocated(By.css('body')), 1000);
        return driver.getCurrentUrl()
          .then(function(url){
             if (reachable) {
              expect(url).to.be.equal(application_host + path);
             } else {
              expect(url).to.be.equal(application_host + 'calendar/');
             }
          });
      })
    };

    // Register new admin user
    return register_new_user_func({
        application_host : application_host,
    })
    // Iterate through admin pages and make sure they are accessible
    .then(function(data){
      return check_pathes(data.driver, true)
        .then(function(){
          return Promise.resolve(data);
        });
    })
    // Add new non-admin user
    .then(function(data){
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // Logout from admin account
    .then(function(data){
      non_admin_user_email = data.new_user_email;
      return logout_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })
    // And login with newly created non-admin account
    .then(function(data){
      return login_user_func({
        application_host : application_host,
        user_email       : non_admin_user_email,
        driver           : data.driver,
      });
    })
    // Iterate throough pathes and make sure they are not reachable
    .then(function(data){
      return check_pathes(data.driver, false)
        .then(function(){
          return Promise.resolve(data);
        });
    })

    // Done!
    .then(function(){
      done();
    })
  });

});

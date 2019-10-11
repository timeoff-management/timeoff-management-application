
'use strict';

var test             = require('selenium-webdriver/testing'),
    config           = require('../lib/config'),
    application_host = config.get_application_host(),
    By        = require('selenium-webdriver').By,
    expect    = require('chai').expect,
    _         = require('underscore'),
    Promise   = require("bluebird"),
    until     = require('selenium-webdriver').until,
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    add_new_user_func      = require('../lib/add_new_user'),
    build_driver           = require('../lib/build_driver');


describe('Try to access private pages with guest user', function(){

  this.timeout( config.get_execution_timeout() );

  it('Check pages', function(done) {

    Promise.all(_.map(
      // Add more URLs to check into the array below
      [
        'logout/', 'settings/general/', 'settings/departments/'
      ],
      function(path) {

        var driver = build_driver()

        // Open front page
        driver.get( application_host + path);
        driver.getCurrentUrl()
          .then(function(url){
            expect(url).to.be.equal(application_host+'login/');
          });

        return driver.quit();
      })
    )
    .then(function(){ done() });
  });

  it('Check main (dashboard) page', function(done) {
    var driver = build_driver();

    // Open front page
    driver.get( application_host);
    driver.getTitle()
      .then(function(title){
        expect(title).to.be.equal('Time Off Management');
      });
    driver.quit().then(function(){ done() });
  });

});


describe('Try to access admin pages with non-admin user', function(){

  this.timeout( config.get_execution_timeout() );

  var non_admin_user_email, driver;

  var check_pathes = function(driver, reachable){

    var admin_pages =  [
      'users/add/',
      'users/',
      'settings/general/',
      'settings/departments/'
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

  it("Register new admin user", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
  });

  it("Iterate through admin pages and make sure they are accessible", function(done){
    check_pathes(driver, true)
      .then(function(){ done() });
  });

  it("Add new non-admin user", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      non_admin_user_email = data.new_user_email;
      done();
    });
  });

  it("Logout from admin account", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("And login with newly created non-admin account", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : non_admin_user_email,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Iterate throough pathes and make sure they are not reachable", function(done){
    check_pathes(driver, false)
      .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

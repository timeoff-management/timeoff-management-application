

'use strict';

var test             = require('selenium-webdriver/testing'),
    application_host = 'http://localhost:3000/',
    expect           = require('chai').expect,
    Promise          = require("bluebird"),
    register_new_user_func = require('../lib/register_new_user'),
    open_page_func         = require('../lib/open_page');

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * try to openregister page
    ** system showl redirect to page

*/

describe('Try to open registeration page with active user in a session', function(){

  this.timeout(90000);

  test.it('Go', function(done){

    var admin_email;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      console.log('    Try to open Registration page');

      return open_page_func({
        url    : application_host + 'register/',
        driver : data.driver,
      });
    })
    .then(function(data){
      return data.driver.getCurrentUrl()
        .then(function(url){
          expect(url).to.be.equal(application_host+'calendar/')
          return Promise.resolve(data);
        });
    })

    // Close browser;
    .then(function(data){ return data.driver.quit(); })
    .then(function(data){
      done();
    });

  });

});

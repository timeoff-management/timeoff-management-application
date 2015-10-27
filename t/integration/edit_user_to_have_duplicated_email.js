
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  Promise                = require("bluebird"),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  application_host       = 'http://localhost:3000/';

/*
 *  Scenario to check:
 *
 *    * Register new account with email EMAIL
 *    * Add new user with new email
 *    * Edit second user and try to assign email EMAIL to it
 *    * There should be an error
 *
 * */


describe('CRUD for users', function(){

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin;

    // Create new company
    return register_new_user_func({
      application_host : application_host,
    })
    // Login with newly created user
    .then(function(data){

      email_admin = data.email;

      return login_user_func({
          application_host : application_host,
          user_email       : data.email,
      });
    })
    // Create second user
    .then(function(data){
      return add_new_user_func({
        application_host : application_host,
        driver           : data.driver,
      });
    })

    // Open 'users' page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/',
        driver : data.driver,
      });
    })

    // Make sure that both users are shown
    // and click on latest user (assuming users are sorted alphabetichally and
    // test user names are derived from epoch)
    .then(function(data){
      return data.driver
        .findElements(By.css( 'div.row-users a' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(2);
          // click on second user link
          return elements[1].click()
        })
        .then(function(){
          return Promise.resolve(data);
        });
    })

    // Try to assign to second user the same email as ADMIN has
    .then(function(data){
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input[name="email"]',
            value    : email_admin,
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Email is already in use/,
      })
    })

    // Update email user with unique email address
    .then(function(data){
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input[name="email"]',
            value    : 'foobar'+email_admin,
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .* were updated/,
      })
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });
  });

});

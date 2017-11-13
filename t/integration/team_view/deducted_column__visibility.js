
'use strict';


/*
 *  Scenario:
 *
 *    Check that values for new columns are shown only for employess
 *    currently login user can supervise.
 *
 *    The reason for this sceanrio is because in UK for instance it is illegal to share
 *    details for employees who are not supervisers. Peers should not know how many days
 *    their coleagues were off sick for instance.
 *
 *    * create account by admin user A
 *    * add user B
 *    * add user C
 *    * ensure company has "Share absences between all employees" flag ON
 *    * make user B to be superviser of user C
 *    * login as user A and ensure team view shows deducted values for all three users
 *    * login as user B and ensure she sees deducted days
 *    * login as user C and ensure she does not see allowance deduction dates 
 *
 * */


const
  test                   = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  Promise                = require("bluebird"),
  expect                 = require('chai').expect,
  add_new_user_func      = require('../../lib/add_new_user'),
  check_elements_func    = require('../../lib/check_elements'),
  config                 = require('../../lib/config'),
  login_user_func        = require('../../lib/login_with_user'),
  logout_user_func       = require('../../lib/logout_user'),
  open_page_func         = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func       = require('../../lib/submit_form'),
  user_info_func         = require('../../lib/user_info'),
  application_host       = config.get_application_host();

describe('Check that values for new columns are shown only for employess currently login user can supervise', function(){

  this.timeout( config.get_execution_timeout() );

  let driver,
    email_A, user_id_A,
    email_B, user_id_B,
    email_C, user_id_C;

  it("Register new company as admin user A", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(data => {
      driver  = data.driver;
      email_A = data.email;
      done();
    });
  });

  it("Create second user B", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(data => {
      email_B = data.new_user_email;
      done();
    });
  });

  it("Create second user C", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(data => {
      email_C = data.new_user_email;
      done();
    });
  });

  it("Obtain information about user A", function(done){
    user_info_func({
      driver : driver,
      email  : email_A,
    })
    .then(data => {
      user_id_A = data.user.id;
      done();
    });
  });

  it("Obtain information about user B", function(done){
    user_info_func({
      driver : driver,
      email  : email_B,
    })
    .then(data => {
      user_id_B = data.user.id;
      done();
    });
  });

  it("Obtain information about user C", function(done){
    user_info_func({
      driver : driver,
      email  : email_C,
    })
    .then(data => {
      user_id_C = data.user.id;
      done();
    });
  });

  after(function(done){
    driver.quit().then(() => done());
  });
});

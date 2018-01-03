
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  until                  = require('selenium-webdriver').until,
  Promise                = require("bluebird"),
  moment                 = require('moment'),
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
  application_host       = config.get_application_host(),
  some_weekday_date      = '2018-01-03';

/*
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as regular user B and place a leave request
 *    * Go to Requests page and ensure that new entry apeared in My leaves section
 *    * New entry is in Pending status and has Delete/Cancel icon
 *    * Cancel leave request
 *    * Ensure that My requests page does not contain any entries
 *    * Login as admin user A and ensure that there is no pending leave requests
 *    * Go to email audit page and ensure that there were two emails regarding cancelation
 *    * Go to user B details and ensure its details shows nothing from allowance was used
 *    * Login back as user B
 *    * Submit leave request for the same date as the first one was
 *    * Ensure it is successful and apperes as Pending
 *
 * */

describe('Leave request cancelation', function(){

  this.timeout( config.get_execution_timeout() );

  var driver, email_A, email_B, user_id_A, user_id_B;

  it('Check precondition', function(){
    expect(moment().format('YYYY')).to.be.eq(moment(some_weekday_date).format('YYYY'));
  });

  it("Register new company", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
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
    .then(function(data){
      email_B = data.new_user_email;
      done();
    });
  });

  it("Obtain information about admin user A", function(done){
    user_info_func({
      driver : driver,
      email  : email_A,
    })
    .then(function(data){
      user_id_A = data.user.id;
      done();
    });
  });

  it("Obtain information about user B", function(done){
    user_info_func({
      driver : driver,
      email  : email_B,
    })
    .then(function(data){
      user_id_B = data.user.id;
      done();
    });
  });

  it("Logout from user A (admin)", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as user B", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_B,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(el){
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000);
      })
      .then(function(){ done() });
  });

  it("Submit new leave request from user B for one weekday", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#from',
        value    : some_weekday_date,
      },{
        selector : 'input#to',
        value    : some_weekday_date,
      }],
      message : /New leave request was added/,
    })
    .then(function(){done()});
  });

  it("Open requests page", function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure newly created request is on Requests page', function(done){
    check_elements_func({
      driver : driver,
      elements_to_check : [{
        selector : 'tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]',
        value    : "cancel",
      }],
    })
    .then(function(){ done() });
  });

  it('Ensure that new request is single one', function(done){
    driver
      .findElements(By.css( 'tr.leave-request-row' ))
      .then(function(elements){
        expect( elements.length ).to.be.eq(1);
        done();
      })
  });

  it('Ensure that new request is in Pending status', function(done){
    driver
      .findElement(By.css( 'tr.leave-request-row .leave-request-row-status' ))
      .then(function(element){
        return element.getText();
      })
      .then(function(status){
        expect( status ).to.be.eq('Pending');
        done();
      });
  });

  it("Cancel leave request", function(done){
    driver
      .findElement(By.css(
        'tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]'
      ))
      .then(function(cancel_btn){
        return cancel_btn.click();
      })
      .then(function(){
        // Wait until page properly is reloaded
        return driver.wait(until.elementLocated(By.css('h1')), 1000);
      })
      .then(function(){ done() });
  });

 it('Ensure that My requests page does not contain any entries', function(done){
    driver
      .findElements(By.css( 'tr.leave-request-row' ))
      .then(function(elements){
        expect( elements.length ).to.be.eq(0);
        done();
      })
 });

  it(" Logout from user B account", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login back as admin user A", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_A,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Open requests page", function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure that there is no pending leave requests', function(done){
    driver
      .findElements(By.css( '.btn-warning' ))
      .then(function(elements){
        expect( elements.length ).to.be.eq(0);
        done();
      })
  });

  it("Open email audit page", function( done ){
    open_page_func({
      url    : application_host + 'audit/email/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure that there were two emails regarding cancelation', function(done){
    driver
      .findElements( By.css('tr.vpp-email-audit-entry-header a.collapsed') )
      .then(function(elements){
        return Promise.map(
          [elements[0], elements[1]],
          function(el){ return el.getText() }
        );
      })
      .then(function(subjects){
        expect(subjects).to.contain('Leave request was cancelled');
        expect(subjects).to.contain('Cancel leave request');
        done();
      })
  });

  it('Open user B absences section', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+user_id_B+'/absences/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure its details shows nothing from allowance was used', function(done){
    driver
      .findElement( By.css('#days_remaining_inp') )
      .then(function(inp){
        return inp.getAttribute('value');
      })
      .then(function(text){
        // It says XX out of XX, where XX are the same
        var allowances = text.match(/(\d+) out of (\d+)/).slice(1,3);
        expect( allowances[0] ).to.be.eq( allowances[1] );
        done();
      })
  });

  it("Logout from user A (admin)", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as user B", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_B,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(el){
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000);
      })
      .then(function(){ done() });
  });

  it("Submit leave request for the same date as the first", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#from',
        value    : some_weekday_date,
      },{
        selector : 'input#to',
        value    : some_weekday_date,
      }],
      message : /New leave request was added/,
    })
    .then(function(){done()});
  });

  it("Open requests page", function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure that new request is in Pending status', function(done){
    driver
      .findElement(By.css( 'tr.leave-request-row .leave-request-row-status' ))
      .then(function(element){
        return element.getText();
      })
      .then(function(status){
        expect( status ).to.be.eq('Pending');
        done();
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

/*
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as employee B and submit leave request
 *    * Ensure that Cancel button is visible for user B
 *    * Login as admin user A
 *    * Go to user B details, ensure new reuest is there but no Cancel button
 * */
describe('Check only requestor can see the Cancel button', function(){

  this.timeout( config.get_execution_timeout() );

  var driver, email_A, email_B, user_id_A, user_id_B;

  it("Register new company", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
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
    .then(function(data){
      email_B = data.new_user_email;
      done();
    });
  });

  it("Obtain information about admin user A", function(done){
    user_info_func({
      driver : driver,
      email  : email_A,
    })
    .then(function(data){
      user_id_A = data.user.id;
      done();
    });
  });

  it("Obtain information about user B", function(done){
    user_info_func({
      driver : driver,
      email  : email_B,
    })
    .then(function(data){
      user_id_B = data.user.id;
      done();
    });
  });

  it("Logout from user A (admin)", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as user B", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_B,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(el){
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000);
      })
      .then(function(){ done() });
  });

  it("Submit new leave requesti from user B", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#from',
        value    : some_weekday_date,
      },{
        selector : 'input#to',
        value    : some_weekday_date,
      }],
      message : /New leave request was added/,
    })
    .then(function(){done()});
  });

  it("Open requests page", function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Ensure Cancel button is visible for user B", function(done){
    driver
      .findElement(By.css(
        'tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]'
      ))
      .then(function(cancel_btn){
        expect( cancel_btn ).to.be.ok;
        done();
      });
  });

  it("Logout from user A (admin)", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as admin user A", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_A,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it('Open user B absences section', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+user_id_B+'/absences/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Ensure new request is there but no Cancel button", function(done){
    driver
      .findElements(By.css(
        'form[action="/requests/cancel/"]'
      ))
      .then(function(cancel_btns){
        expect( cancel_btns.length ).to.be.eq(0);
        done();
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

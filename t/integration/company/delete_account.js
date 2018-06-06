
"use strict";


const
  test                   = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  Promise                = require('bluebird'),
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func        = require('../../lib/login_with_user'),
  logout_user_func       = require('../../lib/logout_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  config                 = require('../../lib/config'),
  application_host       = config.get_application_host(),
  company_edit_form_id   ='#company_edit_form';

/*
 *  Scenario to test:
 *
 *    * Create Company A
 *    * Book a leave by user from company A
 *    * Created Company B
 *    * Book a leave for admin user from company B
 *    * Login as Admin from company A and remove company's account
 *    ** Ensure user is logged out
 *    ** Ensure it is not possible to login back
 *    * Login as admin of company B
 *    ** ensure that admin still has a leave registered
 *    ** ensure that there are still records in Email audit page
 *
 * */

describe("Remove company account", function(){

  this.timeout( config.get_execution_timeout() );

  let driver, emailCompanyA, emailCompanyB;

  it('Create Company A', done => {
    register_new_user_func({
      application_host : application_host,
    })
    .then(data => {
      emailCompanyA = data.email;
      driver        = data.driver;
      done();
    });
  });

  it("Book a leave by user from company A", done => {
    driver.findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
            selector        : 'select[name="from_date_part"]',
            option_selector : 'option[value="2"]',
            value           : "2",
        },{
            selector : 'input#from',
            value : '2018-06-06',
        },{
            selector : 'input#to',
            value : '2018-06-06',
        }],
        message : /New leave request was added/,
      }))
      .then(() => done());
  });

  it("Close down current session", done =>{
    driver.quit().then(() => done());
  });

  it('Create Company B', done => {
    register_new_user_func({
      application_host : application_host,
    })
    .then(data => {
      emailCompanyB = data.email;
      driver        = data.driver;
      done();
    });
  });

  it("Book a leave by user from company B", done => {
    driver.findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
            selector        : 'select[name="from_date_part"]',
            option_selector : 'option[value="2"]',
            value           : "2",
        },{
            selector : 'input#from',
            value : '2018-06-07',
        },{
            selector : 'input#to',
            value : '2018-06-07',
        }],
        message : /New leave request was added/,
      }))
      .then(() => done());
  });

  it("Logout from Company B", done => {
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(() => done());
  });

  it("Login as Admin from company A and remove company's account", done => {
    let companyName;

    login_user_func({
      application_host : application_host,
      user_email       : emailCompanyA,
      driver           : driver,
    })
    .then(() => open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    }))

    // Try to ignore company name confirmation
    .then(() => driver.findElement(By.css('button[data-target="#remove_company_modal"]')))
    .then(btn => btn.click())
    .then(() => driver.sleep(1000))
    .then(() => submit_form_func({
      driver      : driver,
      form_params : [{
        selector        : 'input[name="confirm_name"]',
        value           : "blahblahblah",
      }],
      submit_button_selector : '#remove_company_form button[type="submit"]',
      message : /Failed to remove company. Reason: Provided name confirmation does not match company one/,
    }))

    // Fetch company name
    .then(() => driver.findElement(By.css('#input_company_name')))
    .then(el => el.getAttribute('value'))
    .then(val => Promise.resolve(companyName = val))

    .then(() => driver.findElement(By.css('button[data-target="#remove_company_modal"]')))
    .then(btn => btn.click())
    .then(() => driver.sleep(1000))
    .then(() => submit_form_func({
      driver      : driver,
      form_params : [{
        selector        : 'input[name="confirm_name"]',
        value           : companyName,
      }],
      submit_button_selector : '#remove_company_form button[type="submit"]',
      message : new RegExp(`Company ${ companyName } and related data were successfully removed`),
    }))

    .then(() => done());
  });

  it("Ensure that user is logout (by trying to poen general setting page)", done => {
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(() => driver.getCurrentUrl())
    .then(url => {
      expect(url).to.include('/login/', "URL point to Login page");
      done();
    })
  });

  it("Ensure it is not possible to login back", done => {
    login_user_func({
      application_host : application_host,
      user_email       : emailCompanyA,
      driver           : driver,
      should_fail      : true,
    })
    .then(() => done());
  });

  it("Login as admin of company B", done => {
    login_user_func({
      application_host : application_host,
      user_email       : emailCompanyB,
      driver           : driver,
    })
    .then(() => done());
  });

  it("Ensure that admin still has a leave registered", done => {
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(() => driver.findElements(By.css('table.user-requests-table td[data-tom-leave-dates="1"]')))

    .then(els => {
      expect(els.length, 'Ensure two elements with leave dates were found').to.be.equal(1);
      return Promise.map(els, (el => el.getText()));
    })
    .then(dates_str => {
      expect(dates_str.sort(), 'Ensure that date ranges values are as expected')
        .to.be.deep.equal([
          '2018-06-07 (morning) 2018-06-07'
        ]);
      done();
    });
  });

  it("Ensure that there are still records in Email audit page", done => {
    open_page_func({
      url    : application_host + 'audit/email/',
      driver : driver,
    })
    .then(() => driver.findElements(By.css('tr.vpp-email-audit-entry-header')))
    .then(els => {
      expect(els.length, "Emsure that we have three email records").to.be.equal(3);
      done();
    })
  });

  after(done => {
    driver.quit().then(() => done());
  });

});


'use strict';

const
  test                   = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  By                     = require('selenium-webdriver').By,
  config                 = require('../lib/config'),
  application_host       = config.get_application_host(),
  expect                 = require('chai').expect,
  Bluebird               = require('bluebird'),
  moment                 = require('moment'),
  company_edit_form_id   ='#company_edit_form';

/*
 *  Basic scenario for checking time zones:
 *
 *  * Create a copany
 *  * Update Time zone to be somethng in Australia
 *  * Get the date from Book leave modal and put it into today_aus
 *  * Get the current date from Calendar page and ensure it is the same as today_aus
 *  * Get the current date from Team view page and ensure it is the same as today_aus
 *  * Book a leave and ensure its "created at" value on My requests page is today_aus
 *  * Reject newly added leave
 *  * Update Time zone to be USA/Alaska
 *  * Get the date from Book leave modal and put it into today_usa
 *  * Ensure that today_usa is one day behind the today_aus
 *  * Get the current date from Calendar page and ensure it is the same as today_usa
 *  * Get the current date from Team view page and ensure it is the same as today_usa
 *  * Book a leave and ensure its "created at" value on My requests page is today_usa
 *
 * */

describe('Check Time zones', function(){
  let
    driver,
    user_email,
    today_usa,
    today_aus;

  this.timeout( config.get_execution_timeout() );

  it("Create a company", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      user_email = data.email;
      done();
    });
  });

  it("Open page for editing company details", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(() => done() );
  });

  it("Update Time zone to be somethng in Australia", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector        : company_edit_form_id+' select[name="timezone"]',
        option_selector : 'option[value="Pacific/Auckland"]',
        value           : 'Pacific/Auckland',
      }],
      submit_button_selector : company_edit_form_id+' button[type="submit"]',
      message                : /successfully/i,
      should_be_successful   : true,
    })
    .then(function(){ done() });
  });

  it("Get the date from Book leave modal and put it into today_aus variable", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() => driver.findElement(By.css( 'input.book-leave-from-input' )))
      .then(el => el.getAttribute('value'))
      .then(today => {
        today_aus = today;
        done();
      });
  });

  it("Get the current date from Calendar page and ensure it is the same as today_aus", function(done){
    open_page_func({
      url    : application_host + 'calendar/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css(
      'table.month_'+moment(today_aus).format('MMMM')
      + ' td.half_1st.day_'+moment(today_aus).format('D')+'.current_day_cell'
    )))
    .then(el => {
      expect(el, 'Ensure that current date is marked correctly').to.exist;
      done();
    });
  });

  it("Get the current date from Team view page and ensure it is the same as today_aus", function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css(
      'table.calendar_month td.half_1st.day_'+moment(today_aus).format('D')+'.current_day_cell'
    )))
    .then(el => {
      expect(el, 'Ensure that current date is marked correctly').to.exist;

      return driver.findElement(By.css('div.calendar-section-caption'))
    })
    .then(el => el.getText())
    .then(month_caption => {
      expect(month_caption, 'Ensure month is correct').to.be.eql(moment(today_aus).format('MMMM, YYYY'));
      done();
    })
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then( el => el.click() )
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() => done());
  });

  it("Submit new leave request", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [],
      message : /New leave request was added/,
    })
    .then(() => done());
  });

  it('Ensure its "created at" value on My requests page is today_aus', function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css('tr[vpp="pending_for__'+user_email+'"] td.date_of_request')))
    .then(el => el.getText())
    .then(text => {
      expect(text).to.be.eql(moment(today_aus).format('YYYY-MM-DD'));
      done();
    });
  });

  it('Reject newly added leave', function(done){
    driver
      .findElement(By.css('tr[vpp="pending_for__'+user_email+'"] input[value="Reject"]'))
      .then(el => el.click())
      .then(() => done());
  });

  it("Open page for editing company details", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(() => done() );
  });

  it("Update Time zone to be USA/Alaska", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector        : company_edit_form_id+' select[name="timezone"]',
        option_selector : 'option[value="US/Alaska"]',
        value           : 'US/Alaska',
      }],
      submit_button_selector : company_edit_form_id+' button[type="submit"]',
      message                : /successfully/i,
      should_be_successful   : true,
    })
    .then(function(){ done() });
  });

  it("Get the date from Book leave modal and put it into today_usa", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() => driver.findElement(By.css( 'input.book-leave-from-input' )))
      .then(el => el.getAttribute('value'))
      .then(today => {
        today_usa = today;
        done();
      });
  });

  it("Ensure that today_usa is one day behind the today_aus", function(done){
    expect(moment(today_usa).format('YYYY-MM-DD')).to.be.not.eql(moment(today_aus).format('YYYY-MM-DD'));
    done();
  });

  it("Get the current date from Calendar page and ensure it is the same as today_usa", function(done){
    open_page_func({
      url    : application_host + 'calendar/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css(
      'table.month_'+moment(today_usa).format('MMMM')
      + ' td.half_1st.day_'+moment(today_usa).format('D')+'.current_day_cell'
    )))
    .then(el => {
      expect(el, 'Ensure that current date is marked correctly').to.exist;
      done();
    });
  });

  it("Get the current date from Team view page and ensure it is the same as today_usa", function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css(
      'table.calendar_month td.half_1st.day_'+moment(today_usa).format('D')+'.current_day_cell'
    )))
    .then(el => {
      expect(el, 'Ensure that current date is marked correctly').to.exist;

      return driver.findElement(By.css('div.calendar-section-caption'))
    })
    .then(el => el.getText())
    .then(month_caption => {
      expect(month_caption, 'Ensure month is correct').to.be.eql(moment(today_usa).format('MMMM, YYYY'));
      done();
    })
  });

  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then( el => el.click() )
      // This is very important line when working with Bootstrap modals!
      .then(el => driver.sleep(1000))
      .then(() => done());
  });

  it("Submit new leave request", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [],
      message : /New leave request was added/,
    })
    .then(() => done());
  });

  it('Ensure its "created at" value on My requests page is today_usa', function( done ){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(() => driver.findElement(By.css('tr[vpp="pending_for__'+user_email+'"] td.date_of_request')))
    .then(el => el.getText())
    .then(text => {
      expect(text).to.be.eql(moment(today_usa).format('YYYY-MM-DD'));
      done();
    });
  });

  after(function(done){
    driver.quit().then(() => done());
  });

});

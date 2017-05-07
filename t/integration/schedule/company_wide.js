
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  Promise                = require("bluebird"),
  expect                 = require('chai').expect,
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  check_elements_func    = require('../../lib/check_elements'),
  config                 = require('../../lib/config'),
  application_host       = config.get_application_host(),
  schedule_form_id       = '#company_schedule_form';

/*
 *  Scenario 1:
 *    * Register new company
 *    * Go to company details page update scedule to be non-default
 *    * Ensure that company details page shows updated schedule
 *    * Go to Calendar page and make sure that it reflects new scedule
 *    * Go to Team view page and make sure it reflects new schedule
 *
 * */

describe("Changing default company wide schedule", function(){

  this.timeout( config.get_execution_timeout() );

  var driver;

  it("Register new company", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
  });

  it("Open company details page", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure company has default schedule', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : schedule_form_id + ' input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="wednesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="friday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : schedule_form_id + ' input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Make Wednesday to be non-working day', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : schedule_form_id + ' #schedule_item_wednesday',
        tick     : true,
      }],
      submit_button_selector : schedule_form_id+' button[type="submit"]',
      message : /Schedule for company was saved/,
    })
    .then(function(){ done() });
  });

  it('And make sure that it was indeed marked so', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : schedule_form_id + ' input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="wednesday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : schedule_form_id + ' input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="friday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : schedule_form_id + ' input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Open Calendar page', function(done){
    open_page_func({
      url    : application_host + 'calendar/?year=2015&show_full_year=1',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('... and ensure Wednesday is marked as non-working day', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.month_January td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.match(/\bweekend_cell\b/);
        done();
      });
  });

  it('... and ensure that Monday is still working day', function(done){
    driver
      .findElement(By.css('table.month_January td.day_5'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).not.to.match(/\bweekend_cell\b/);
        done();
      });
  });

  it('Open Team view page', function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/?&date=2015-01',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('... and make sure Wednsday is marked as non-working day', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.calendar_month td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.match(/\bweekend_cell\b/);
        done();
      });
  });

  it('... and ensure Monday is still working day', function(done){
    driver
      .findElement(By.css('table.calendar_month td.day_5'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).not.to.match(/\bweekend_cell\b/);
        done();
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

/*
 *  Scenario 2:
 *    * Create a company
 *    * Book holiday that streches over the weekend
 *    * Ensure it calculates "used days" correctly
 *    * Update company to have Saturday to be working day
 *    * Ensure the "used days" for previously added leave reflects the change
 * */

describe('Leave request reflects shanges in company schedule', function(){

  this.timeout( config.get_execution_timeout() );

  var driver;

  it("Register new company", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
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

  it("Submit new leave requesti for 7 calendar days", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input#from',
        value    : '2015-06-15',
      },{
        selector : 'input#to',
        value    : '2015-06-21',
      }],
      message : /New leave request was added/,
    })
    .then(function(){done()});
  });

  it("Open requests page", function(done){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('... and ensure newly created request deducts 5 days from allowance', function(done){
    driver.findElement(By.css('td[data-vpp="days_used"]'))
    .then(function(el){ return el.getText() })
    .then(function(days_used){
      expect(days_used).to.be.equal('5');
    })
    .then(function(){done()});
  });

  it("Open company details page", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Make Saturday to be working day', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : schedule_form_id + ' #schedule_item_saturday',
        tick     : true,
      }],
      submit_button_selector : schedule_form_id+' button[type="submit"]',
      message : /Schedule for company was saved/,
    })
    .then(function(){ done() });
  });

  it("Open requests page", function(done){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('... and ensure newly created request deducts 6 days from allowance', function(done){
    driver.findElement(By.css('td[data-vpp="days_used"]'))
    .then(function(el){ return el.getText() })
    .then(function(days_used){
      expect(days_used).to.be.equal('6');
    })
    .then(function(){done()});
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });

});

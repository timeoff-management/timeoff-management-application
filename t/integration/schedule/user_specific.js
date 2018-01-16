
'use strict';

var test                 = require('selenium-webdriver/testing'),
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
  application_host       = config.get_application_host(),
  schedule_form_id       = '#company_schedule_form';

/*
 * Scenario 1: Basic user specific schedule
 *
 *    * Create a company with user A as admin
 *    * Create second user B
 *    * Update user B to have Wed to be non-working day
 *    * Ensure that User B details shows new schedule
 *    * Ensure that Company wide schedule still default: Sat and Sun are non-working
 *    * Make sure that team view shows user A has Sat and Sun as non-working days
 *    * Make sure team view shows user B has Wed, Sat, Sun as non-working days
 *    * Go to calnadar page and ensure that only Sat and Sun are non-working days
 *    * Book a 7 days holiday for user A and ansure that it has 5 deducted days
 *    * Logout form user A and login as user B
 *    * Eansure its calendar page shows WED,Sat, and Sun as non-working days
 *    * Book a holiday for 7 days and make sure that 4 days deducted from allowance
 *    * Logout from user B and logn back as admin A
 *    * Go to user B schedule and revoke it to be replaced with company wide one
 *    * Go to Team view page and ensure both users A and B have only Sat and Sun as non-working
 *
 * */

describe('Basic user specific schedule', function(){

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

  it("Obtain information about user A", function(done){
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

  it('Open user B schedule and ensure wording indicates company wide one is used', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+user_id_B+'/schedule/',
      driver : driver,
    })
    .then(function(){
      return driver
        .findElement( By.css('a[data-vpp="link-to-company-schedule"]') )
        .then(function(company_schedule_link){
          expect(company_schedule_link).to.be.ok;
          return Promise.resolve();
        })
    })
    .then(function(){
      driver
        .findElement( By.css('button[name="save_user_specific_schedule"]') )
        .then(function(button){ return button.getText() })
        .then(function(caption){
          expect(caption).to.be.equal('Override company wide schedule');
          done();
        })
    });
  });

  it('Ensure it has default configuration', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : 'input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="wednesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="friday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Update user B to have Wed to be non-working day', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : '#schedule_item_wednesday',
        tick     : true,
      }],
      submit_button_selector : 'button[name="save_user_specific_schedule"]',
      message : /Schedule for user was saved/,
    })
    .then(function(){ done() });
  });

  it('Ensure that User B details shows new schedule', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : 'input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="wednesday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="friday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it("Open company details page", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure Company wide schedule is still default: Sat, Sun are non-working', function(done){
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

  it('Open Team view page', function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/?&date=2015-01',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('Make sure that team view shows user A has Sat and Sun as non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.not.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){ done() });
  });

  it('Make sure team view shows user B has Wed, Sat, Sun as non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
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

  it('... ensure that only Sat and Sun are non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.month_January td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.not.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.month_January td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          })
      })
      .then(function(){
        return driver
          .findElement(By.css('table.month_January td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          })
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

  it("Submit new leave requesti from user A for 7 calendar days", function(done){
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

  it('Open Calendar page', function(done){
    open_page_func({
      url    : application_host + 'calendar/?year=2015&show_full_year=1',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('... ensure its calendar page shows WED,Sat, and Sun as non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.month_January td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.month_January td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          })
      })
      .then(function(){
        return driver
          .findElement(By.css('table.month_January td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          })
      })
      .then(function(){ done() });
  });

 //*    * Book a holiday for 7 days and make sure that 4 days deducted from allowance
  it("Open Book leave popup window", function(done){
    driver.findElement(By.css('#book_time_off_btn'))
      .then(function(el){ return el.click() })
      .then(function(el){
        // This is very important line when working with Bootstrap modals!
        return driver.sleep(1000);
      })
      .then(function(){ done() });
  });

  it("Submit new leave requesti from user A for 7 calendar days", function(done){
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


  it("Logout from user B", function(done){
    logout_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(){ done() });
  });

  it("Login as user A (admin)", function(done){
    login_user_func({
      application_host : application_host,
      user_email       : email_A,
      driver           : driver,
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

  it('... and ensure irequest from user B deducts 4 days from allowance', function(done){
    driver.findElement(By.css('tr[vpp="pending_for__'+email_B+'"] td[data-vpp="days_used"]'))
    .then(function(el){ return el.getText() })
    .then(function(days_used){
      expect(days_used).to.be.equal('4');
    })
    .then(function(){done()});
  });

  it('Open user B schedule', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+user_id_B+'/schedule/',
      driver : driver,
    })
    .then(function(){
      return driver
        .findElement( By.css('strong[data-vpp="declare-user-specific-schedule"]') )
        .then(function(el){
          expect(el).to.be.ok;
          return Promise.resolve();
        })
    })
    .then(function(){
      driver
        .findElement( By.css('button[name="save_user_specific_schedule"]') )
        .then(function(button){ return button.getText() })
        .then(function(caption){
          expect(caption).to.be.equal('Save employee specific schedule');
          done();
        })
    });
  });

  it('Revoke user specific schedule and replace it with company wide one', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{}],
      submit_button_selector : 'button[name="revoke_user_specific_schedule"]',
      message : /Schedule for user was saved/,
    })
    .then(function(){ done() });
  });

  it('Ensure that User B details shows new schedule', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : 'input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="wednesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="friday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Open Team view page', function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/?&date=2015-01',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('Make sure that team view shows user A has Sat and Sun as non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.not.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){ done() });
  });

  it('Make sure team view shows user B also has Sat, Sun as non-working days', function(done){
    driver
      // We know that 7th of January 2015 is Wednesday
      .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_7'))
      .then(function(el){ return el.getAttribute('class'); })
      .then(function(css){
        expect(css).to.not.match(/\bweekend_cell\b/);
        return Promise.resolve(1);
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_10'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){
        return driver
          .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_11'))
          .then(function(el){ return el.getAttribute('class'); })
          .then(function(css){
            expect(css).to.match(/\bweekend_cell\b/);
            return Promise.resolve(1);
          });
      })
      .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

/*
 *  Scenario 2: Populate company wide schedule before using user specific one
 *    (the main point of this test is to ensure that having explicite company schedule
 *    does not break things)
 *
 *    * Create company with User A and User B
 *    * Populate company schedule with something other than default: Thu, Fri, Sat, Sun
 *    * Go and update user B to have specific schedule: Fri, Sat, Sun
 *    * Open Teamview page and make sure users A and B have correct non-working days
 *
 * */

describe('Populate company wide schedule before using user specific one', function(){

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

  it("Obtain information about user A", function(done){
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

  it("Open company details page", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Make Thu and Fri to be non-working day', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : schedule_form_id + ' #schedule_item_thursday',
        tick     : true,
      },{
        selector : schedule_form_id + ' #schedule_item_friday',
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
        value    : 'on',
      },{
        selector : schedule_form_id + ' input[name="thursday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : schedule_form_id + ' input[name="friday"]',
        tick     : true,
        value    : 'off',
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

  it('Open user B schedule', function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+user_id_B+'/schedule/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Update user B to have Fri to be non-working day (by toggling off Thu)', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : '#schedule_item_thursday',
        tick     : true,
      }],
      submit_button_selector : 'button[name="save_user_specific_schedule"]',
      message : /Schedule for user was saved/,
    })
    .then(function(){ done() });
  });

  it('Ensure that User B details shows new schedule', function(done){
    check_elements_func({
      driver            : driver,
      elements_to_check : [{
        selector : 'input[name="monday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="tuesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="wednesday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="thursday"]',
        tick     : true,
        value    : 'on',
      },{
        selector : 'input[name="friday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="saturday"]',
        tick     : true,
        value    : 'off',
      },{
        selector : 'input[name="sunday"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Open Team view page', function(done){
    open_page_func({
      url    : application_host + 'calendar/teamview/?&date=2015-01',
      driver : driver,
    })
    .then(function(){done()});
  });

  it('Ensure team view shows user A has Mon, Tue, Wed as working days', function(done){
    Promise.map([5,6,7], function(day_number){
      return driver
        .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_'+day_number))
        .then(function(el){ return el.getAttribute('class'); })
        .then(function(css){
          expect(css).to.not.match(/\bweekend_cell\b/);
          return Promise.resolve(1);
        })
    })
    .then(function(){ done() });
  });

  it('Ensure team view shows user A has Thu, Fri, Sat, Sun as non-working days', function(done){
    Promise.map([8,9,10,11], function(day_number){
      return driver
        .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_A+'"] td.day_'+day_number))
        .then(function(el){ return el.getAttribute('class'); })
        .then(function(css){
          expect(css).to.match(/\bweekend_cell\b/);
          return Promise.resolve(1);
        })
    })
    .then(function(){ done() });
  });

  it('Ensure team view shows user B has Mon, Tue, Wed, Thu as working days', function(done){
    Promise.map([5,6,7,8], function(day_number){
      return driver
        .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_'+day_number))
        .then(function(el){ return el.getAttribute('class'); })
        .then(function(css){
          expect(css).to.not.match(/\bweekend_cell\b/);
          return Promise.resolve(1);
        })
    })
    .then(function(){ done() });
  });

  it('Ensure team view shows user B has Fri, Sat, Sun as non-working days', function(done){
    Promise.map([9,10,11], function(day_number){
      return driver
        .findElement(By.css('table.team-view-table tr[data-vpp-user-list-row="'+user_id_B+'"] td.day_'+day_number))
        .then(function(el){ return el.getAttribute('class'); })
        .then(function(css){
          expect(css).to.match(/\bweekend_cell\b/);
          return Promise.resolve(1);
        })
    })
    .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});


'use strict';

const
  test                   = require('selenium-webdriver/testing'),
  until                  = require('selenium-webdriver').until,
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func        = require('../../lib/login_with_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  By                     = require('selenium-webdriver').By,
  config                 = require('../../lib/config'),
  Bluebird               = require('bluebird'),
  expect                 = require('chai').expect,
  application_host       = config.get_application_host(),
  leave_type_edit_form_id='#leave_type_edit_form';

/*
 *  Aim of the scenario: to ensure that half a days are highlighted correctly
 *  on calenda page.
 *
 *  In addition ensure that reports count half a days correctly.
 *
 *   * Create an account
 *   * Changes default color for Sick days to be "color 3"
 *   * Add following absences:
 *   ** 2018-02-01 (afternoon) - 2018-02-02 (morning) : Sick (1 day)
 *   ** 2018-02-02 (afternoon) - 2018-02-02 (afternnon) : Holiday (0.5 days)
 *   ** 2018-02-08 (morning)   - 2018-02-08 (morning) : Holiday (0.5 days)
 *   ** 2018-02-13 (afternoon) - 2018-02-14 (morning) : Sick (1 day)
 *   ** 2018-02-14 (afternoon) - 2018-02-15 (morning) : Holiday (1 day)
 *   * Ensure that all absences are approved
 *
 *   * Go to callendar page and ensure that all half days cells have correct color classes
 *   * Go to Team view page and ensure that all half a day cells have correct color classes
 *   * On Team view page ensure that days deducted from allowance are stated correctly
 *   ** 2 days
 *   * Go to report page and for 2018-02 ensure that report contains correct summaries:
 *   ** Sick:  2 days
 *   ** Holiday: 2 days
 *   ** Allowance: 2 days
 *
 *
 * */

describe('Coloring of half days', function(){

  var driver;

  this.timeout( config.get_execution_timeout() );

  it("Performing registration process", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(data => {
      driver = data.driver;
      done();
    });
  });

  it('Changes default color for Sick days to be "color 3"', done => {
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(() => submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] button.dropdown-toggle',
        dropdown_option : leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] [data-tom-color-picker-css-class="leave_type_color_3"]'
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      message : /Changes to leave types were saved/,
    }))

    .then(() => done() );
  });

  it('Go Calendar page', done => {
    open_page_func({
      url    : application_host,
      driver : driver,
    })
    .then(() => done());
  });

  it("Add absence: 2018-02-01 (afternoon) - 2018-02-02 (morning) Sick", done => {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector        : 'select[name="from_date_part"]',
          option_selector : 'option[value="3"]',
        },{
          selector : 'input#from',
          value    : '2018-02-01',
        },{
          selector        : 'select[name="to_date_part"]',
          option_selector : 'option[value="2"]',
        },{
          selector : 'input#to',
          value    : '2018-02-02',
        },{
          selector : 'select#leave_type',
          option_selector : '[data-tom="Sick Leave"]'
        }],
        message : /New leave request was added/,
      }))
      .then(() => done());
  });

  it("Add absence: 2018-02-02 (afternoon) - 2018-02-02 (afternnon) : Holiday", done => {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector        : 'select[name="from_date_part"]',
          option_selector : 'option[value="3"]',
        },{
          selector : 'input#from',
          value    : '2018-02-02',
        },{
          selector        : 'select[name="to_date_part"]',
          option_selector : 'option[value="3"]',
        },{
          selector : 'input#to',
          value    : '2018-02-02',
        },{
          selector : 'select#leave_type',
          option_selector : '[data-tom="Holiday"]'
        }],
        message : /New leave request was added/,
        submit_button_selector : '#book_leave_modal button[type="submit"]'
      }))
      .then(() => done());
  });

  it("Add absence: 2018-02-08 (morning) - 2018-02-08 (morning) : Holiday (0.5 days)", done => {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector        : 'select[name="from_date_part"]',
          option_selector : 'option[value="2"]',
        },{
          selector : 'input#from',
          value    : '2018-02-08',
        },{
          selector        : 'select[name="to_date_part"]',
          option_selector : 'option[value="2"]',
        },{
          selector : 'input#to',
          value    : '2018-02-08',
        },{
          selector : 'select#leave_type',
          option_selector : '[data-tom="Holiday"]'
        }],
        message : /New leave request was added/,
        submit_button_selector : '#book_leave_modal button[type="submit"]'
      }))
      .then(() => done());
  });

  it("Add absence: 2018-02-13 (afternoon) - 2018-02-14 (morning) : Sick", done => {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector        : 'select[name="from_date_part"]',
          option_selector : 'option[value="3"]',
        },{
          selector : 'input#from',
          value    : '2018-02-13',
        },{
          selector        : 'select[name="to_date_part"]',
          option_selector : 'option[value="2"]',
        },{
          selector : 'input#to',
          value    : '2018-02-14',
        },{
          selector : 'select#leave_type',
          option_selector : '[data-tom="Sick Leave"]'
        }],
        message : /New leave request was added/,
        submit_button_selector : '#book_leave_modal button[type="submit"]'
      }))
      .then(() => done());
  });

  it("Add absence: 2018-02-14 (afternoon) - 2018-02-15 (morning) : Holiday", done => {
    driver
      .findElement(By.css('#book_time_off_btn'))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector        : 'select[name="from_date_part"]',
          option_selector : 'option[value="3"]',
        },{
          selector : 'input#from',
          value    : '2018-02-14',
        },{
          selector        : 'select[name="to_date_part"]',
          option_selector : 'option[value="2"]',
        },{
          selector : 'input#to',
          value    : '2018-02-15',
        },{
          selector : 'select#leave_type',
          option_selector : '[data-tom="Holiday"]'
        }],
        message : /New leave request was added/,
        submit_button_selector : '#book_leave_modal button[type="submit"]'
      }))
      .then(() => done());
  });

  it("Open requests page", function(done){
    open_page_func({
      url    : application_host + 'requests/',
      driver : driver,
    })
    .then(() => done());
  });

  it("Ensure that all absences are approved", function(done){
    driver.findElement(By.css('tr[vpp] .btn-success'))
      .then(el => el.click())
      .then(() => driver.wait(until.elementLocated(By.css('h1')), 1000))

      .then(() => driver.findElement(By.css('tr[vpp] .btn-success')))
      .then(el => el.click())
      .then(() => driver.wait(until.elementLocated(By.css('h1')), 1000))

      .then(() => driver.findElement(By.css('tr[vpp] .btn-success')))
      .then(el => el.click())
      .then(() => driver.wait(until.elementLocated(By.css('h1')), 1000))

      .then(() => driver.findElement(By.css('tr[vpp] .btn-success')))
      .then(el => el.click())
      .then(() => driver.wait(until.elementLocated(By.css('h1')), 1000))

      .then(() => driver.findElement(By.css('tr[vpp] .btn-success')))
      .then(el => el.click())
      .then(() => driver.wait(until.elementLocated(By.css('h1')), 1000))

      .then(() => done());
  });

  it('Go to callendar page and ensure that all half days cells have correct color classes', done =>{
    open_page_func({
      url    : application_host + 'calendar/?year=2018&show_full_year=1',
      driver : driver,
    })

    .then(() => driver.findElement(By.css('table.month_February td.calendar_cell.day_1.half_1st')))
    .then(el => el.getAttribute('class'))
    .then(cls => {
      expect(cls).not.to.match(/leave_type_color_/);
      return Bluebird.resolve();
    })

    .then(() => driver.findElement(By.css('table.month_February td.calendar_cell.day_1.half_2nd')))
    .then(el => el.getAttribute('class'))
    .then(cls => {
      expect(cls).to.match(/leave_type_color_3/);
      return Bluebird.resolve();
    })

    .then(() => done());

  });


  after(function(done){
    driver.quit().then(() => done() );
  });

});

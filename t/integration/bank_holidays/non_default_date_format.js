
"use strict";

var
  test                    = require('selenium-webdriver/testing'),
  register_new_user_func  = require('../../lib/register_new_user'),
  open_page_func          = require('../../lib/open_page'),
  submit_form_func        = require('../../lib/submit_form'),
  expect                  = require('chai').expect,
  By                      = require('selenium-webdriver').By,
  application_host        = 'http://localhost:3000/',
  bankholiday_form_id     = '#update_bankholiday_form',
  new_bankholiday_form_id = '#add_new_bank_holiday_form',
  company_edit_form_id    = '#company_edit_form';

/*
 * This is a regressiopn for https://github.com/timeoff-management/application/issues/103
 *
 * The scenario:
 *
 *  * create new company with non-default date format
 *  * ensure that there are no bank holidays for the account
 *  * add thee bank holidays on 1 Jan, 2, Jan and 1 May
 *  * edit labels for newly added holidays
 *  * and make sure that dates were not changes as part of the update
 *
 * */

describe('Try to manage Bank holidays with non-default date format', function(){

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(60000);

  test.it('Go!', function(done){

    // Performing registration process, and make sure that company has non-default date format
    register_new_user_func({
      application_host    : application_host,
      default_date_format : 'DD/MM/YYYY',
    })

    // Open page with bank holidays
    .then(function(data){
      return open_page_func({
        url    : application_host + 'settings/general/',
        driver : data.driver,
      });
    })

    // Remove default predefined bank holidays
    .then(function(data){
       return submit_form_func({
        driver                 : data.driver,
        message                : /Bank holiday was successfully removed/,
        submit_button_selector : bankholiday_form_id+' button[value="0"]',
      });
    })

    // And make sure that no bank holidays are shown
    .then(function(data){
      return data.driver.findElement(By.css('div.tst-no-bank-holidays'))
        .then(function(el){ return el.getText(); })
        .then(function(txt){ expect(txt).to.exist; return Promise.resolve(data); })
    })

    // Add New year
    .then(function(data){
      return data.driver.findElement(By.css('#add_new_bank_holiday_btn'))
        .then(function(el){ return el.click(); })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          data.driver.sleep(1000);

          return submit_form_func({
            driver      : data.driver,
            form_params : [{
              selector : new_bankholiday_form_id+' input[name="name__new"]',
              value : 'New Year',
            },{
              selector : new_bankholiday_form_id+' input[name="date__new"]',
              value : '01/01/2015',
            }],
            submit_button_selector: new_bankholiday_form_id+' button[type="submit"]',
            message : /Changes to bank holidays were saved/,
          });
        });
    })

    // Add Second day of New year
    .then(function(data){
      return data.driver.findElement(By.css('#add_new_bank_holiday_btn'))
        .then(function(el){ return el.click(); })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          data.driver.sleep(1000);

          return submit_form_func({
            driver      : data.driver,
            form_params : [{
              selector : new_bankholiday_form_id+' input[name="name__new"]',
              value : 'Second day of New Year',
            },{
              selector : new_bankholiday_form_id+' input[name="date__new"]',
              value : '02/01/2015',
            }],
            submit_button_selector: new_bankholiday_form_id+' button[type="submit"]',
            message : /Changes to bank holidays were saved/,
          });
        });
    })

    // Add Add Labour day
    .then(function(data){
      return data.driver.findElement(By.css('#add_new_bank_holiday_btn'))
        .then(function(el){ return el.click(); })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          data.driver.sleep(1000);

          return submit_form_func({
             driver      : data.driver,
             form_params : [{
               selector : new_bankholiday_form_id+' input[name="name__new"]',
               value : 'Labour day',
             },{
               selector : new_bankholiday_form_id+' input[name="date__new"]',
               value : '01/05/2015',
             }],
             submit_button_selector: new_bankholiday_form_id+' button[type="submit"]',
             message : /Changes to bank holidays were saved/,
           });
        });
    })


    // Rename Christmas to have proper name
    .then(function(data){
       return submit_form_func({
         driver      : data.driver,
         form_params : [{
           selector : bankholiday_form_id+' input[name="name__0"]',
           value    : 'NOTHING',
         },{
           selector : bankholiday_form_id+' input[name="name__1"]',
           value    : 'NOTHING',
         },{
           selector : bankholiday_form_id+' input[name="name__2"]',
           value    : 'NOTHING',
         }],
         elements_to_check : [{
           selector : bankholiday_form_id+' input[name="date__0"]',
           value    : '01/01/2015',
         },{
           selector : bankholiday_form_id+' input[name="date__1"]',
           value    : '02/01/2015',
         },{
           selector : bankholiday_form_id+' input[name="date__2"]',
           value    : '01/05/2015',
         }],
         submit_button_selector : bankholiday_form_id+' button[type="submit"]',
         message                : /Changes to bank holidays were saved/,
         should_be_successful   : true,
      });
    })

    .then(function(data){
      data.driver.quit().then(function(){ done(); });
    });

  });

});


'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func        = require('../../lib/login_with_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  check_elements_func    = require('../../lib/check_elements'),
  moment                 = require('moment'),
  By                     = require('selenium-webdriver').By,
  application_host       = 'http://localhost:3000/',
  bankholiday_form_id    = '#update_bankholiday_form',
  new_bankholiday_form_id= '#add_new_bank_holiday_form',
  new_user_email;


describe('CRUD for bank holidays', function(){
  var driver;

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(60000);

  test.it('Check in one go', function(done){

    // Performing registration process
    register_new_user_func({
        application_host : application_host,
    })

    // Open page with bank holidays
    .then(function(data){
        new_user_email = data.email;
        return open_page_func({
            url    : application_host + 'settings/general/',
            driver : data.driver,
        });
    })

    // Check if there are default bank holidays
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : bankholiday_form_id+' input[name="name__0"]',
                value    : 'Early May bank holiday',
            },{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value    : '2015-05-04',
            }],
        });
    })


    // Try to submit form with incorrect bank holiday name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : bankholiday_form_id+' input[name="name__0"]',
                value    : '<script>Test name',
            }],
            submit_button_selector : bankholiday_form_id+' button[type="submit"]',
            message : /New name of .+ should contain only letters and numbers/,
        });
    })


    // Try to submit form with incorrect date
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value    : 'crap',
            }],
            submit_button_selector : bankholiday_form_id+' button[type="submit"]',
            message : /Changes to bank holidays were saved/,
        });
    })

    // Check that after some crappy input was provided into the date, it falls back
    // to the current date
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : bankholiday_form_id+' input[name="name__0"]',
                value    : 'Early May bank holiday',
            },{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value    : moment().format('YYYY-MM-DD'),
            }],
        });
    })

    // Update Early spring holiday to be 4th of May
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value : '2015-05-04',
            }],
            submit_button_selector : bankholiday_form_id+' button[type="submit"]',
            message : /Changes to bank holidays were saved/,
        });
    })


    // Add new bank holiday to be in the beginning of the list
    .then(function(data){

      return data.driver.findElement(By.css('#add_new_bank_holiday_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

           // This is very important line when working with Bootstrap modals!
           data.driver.sleep(1000);

           return submit_form_func({
              driver      : data.driver,
              form_params : [{
                  selector : new_bankholiday_form_id+' input[name="name__new"]',
                  value : 'Z New Year',
              },{
                  selector : new_bankholiday_form_id+' input[name="date__new"]',
                  value : '2015-01-01',
              }],
              submit_button_selector: new_bankholiday_form_id+' button[type="submit"]',
              message : /Changes to bank holidays were saved/,
            });
          });
    })

    // Add new bank holiday to be in the end of the list
    .then(function(data){

      return data.driver.findElement(By.css('#add_new_bank_holiday_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

           // This is very important line when working with Bootstrap modals!
           data.driver.sleep(1000);

           return submit_form_func({
              driver      : data.driver,
              form_params : [{
                  selector : new_bankholiday_form_id+' input[name="name__new"]',
                  value : 'Xmas',
              },{
                  selector : new_bankholiday_form_id+' input[name="date__new"]',
                  value : '2015-12-25',
              }],
              submit_button_selector: new_bankholiday_form_id+' button[type="submit"]',
              message : /Changes to bank holidays were saved/,
            });
        });
    })

    // Check that the order of all three holidays is based on dates rather than names
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : bankholiday_form_id+' input[name="name__0"]',
                value    : 'Z New Year',
            },{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value    : '2015-01-01',
            },{
                selector : bankholiday_form_id+' input[name="name__1"]',
                value    : 'Early May bank holiday',
            },{
                selector : bankholiday_form_id+' input[name="date__1"]',
                value    : '2015-05-04',
            },{
                selector : bankholiday_form_id+' input[name="name__2"]',
                value    : 'Xmas',
            },{
                selector : bankholiday_form_id+' input[name="date__2"]',
                value    : '2015-12-25',
            }],
        });
    })

    // Rename Christmas to have proper name
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : bankholiday_form_id+' input[name="name__1"]',
                value    : 'Christmas',
            }],
            elements_to_check : [{
                selector : bankholiday_form_id+' input[name="name__1"]',
                value    : 'Christmas',
            },{
                selector : bankholiday_form_id+' input[name="date__1"]',
                value    : '2015-12-25',
            }],
            submit_button_selector : bankholiday_form_id+' button[type="submit"]',
            message : /Changes to bank holidays were saved/,
        });
    })


    // Remove Spring bank holiday
    .then(function(data){
         return submit_form_func({
            driver : data.driver,
            elements_to_check : [{
                selector : bankholiday_form_id+' input[name="name__0"]',
                value    : 'Z New Year',
            },{
                selector : bankholiday_form_id+' input[name="date__0"]',
                value    : '2015-01-01',
            },{
                selector : bankholiday_form_id+' input[name="name__2"]',
                value    : 'Christmas',
            },{
                selector : bankholiday_form_id+' input[name="date__2"]',
                value    : '2015-12-25',
            }],
            submit_button_selector : bankholiday_form_id+' button[value="1"]',
            message : /Bank holiday was successfully removed/,
        });
    })

    .then(function(data){
        data.driver.quit().then(function(){ done(); });
    });

  });

});


'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  application_host       = 'http://localhost:3000/',
  company_edit_form_id   ='#company_edit_form';


describe('Edit company details', function(){
  var driver;

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(50000);

  test.it('Check default registration path', function(done){

    // Performing registration process
    register_new_user_func({
        application_host : application_host,
    })

    // Open page for editing company details
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/general/',
            driver : data.driver,
        });
    })

    // Try to submit form with incorrect company name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : company_edit_form_id+' input[name="name"]',
                value    : '<script>Test companu ltd',
            }],
            submit_button_selector : company_edit_form_id+' button[type="submit"]',
            message : /Name should contain only letters and numbers/,
        });
    })

    // Check that country allows to add only letters and number (no spaces)
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : company_edit_form_id+' input[name="country"]',
                value    : 'United Kingdom',
            }],
            submit_button_selector : company_edit_form_id+' button[type="submit"]',
            message : /Country should contain only letters and numbers/,
        });
    })

    // Check that company is been updated if valid values are submitted
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : company_edit_form_id+' input[name="name"]',
                value    : 'Test companu ltd',
            },{
                selector : company_edit_form_id+' input[name="country"]',
                value    : 'UA',
            }],
            submit_button_selector : company_edit_form_id+' button[type="submit"]',
            message : /successfully/i,
            should_be_successful : true,
        });
    })

    // Close browser;
    .then(function(data){
        data.driver.quit().then(function(){ done(); });
    });

  });
});


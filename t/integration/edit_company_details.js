
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  application_host       = 'http://localhost:3000/',
  new_user_email;


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

    // Login with newly created user
    .then(function(data){
        new_user_email = data.email;

        // Checking that new user can login
        return login_user_func({
            application_host : application_host,
            user_email       : new_user_email,
        });
    })

    // Open page for editing company details
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/company',
            driver : data.driver,
        });
    })

    // Try to submit form with incorrect company name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name"]',
                value    : '<script>Test companu ltd',
            }],
            message : /Name should contain only letters and numbers/,
        });
    })

    // Check that country allows to add only letters and number (no spaces)
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="country"]',
                value    : 'United Kingdom',
            }],
            message : /Country should contain only letters and numbers/,
        });
    })

    // Check that company is been updated if valid values are submitted
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name"]',
                value    : 'Test companu ltd',
            },{
                selector : 'input[name="country"]',
                value    : 'UA',
            }],
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


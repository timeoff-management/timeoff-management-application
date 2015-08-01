
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  application_host       = 'http://localhost:3000/',
  new_user_email;


describe('CRUD for departments', function(){
  var driver;

  // The app is really slow and does not manage to handle request in
  // default 2 seconds, so be more patient.
  this.timeout(60000);

  test.it('Check in one go', function(done){

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
            url    : application_host + 'settings/departments/',
            driver : data.driver,
        });
    })

    // Try to submit form with incorrect department name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name__0"]',
                value    : '<script>Test companu ltd',
            }],
            message : /New name of \w+ should contain only letters and numbers/,
        });
    })

    // Check that updating department allowance and Use allowance flag works
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector        : 'select[name="allowence__0"]',
                option_selector : 'option[value="50"]',
                value : '50',
            },{
                selector : 'input[name="include_public_holidays__0"]',
                tick     : true,
                value    : 'off',
            }],
            should_be_successful : true,
            message : /Changes to departments were saved/,
        });
    })

    // Do check box once again just to check that its value keeps changing
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="include_public_holidays__0"]',
                tick     : true,
                value    : 'on',
            }],
            should_be_successful : true,
            message : /Changes to departments were saved/,
        });
    })

    // Add mew "Marketing" department
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__new"]',
                value : 'Marketing',
            },{
                selector        : 'select[name="allowence__new"]',
                option_selector : 'option[value="10"]',
                value : '10',
            }],
            message : /Changes to departments were saved/,
        });
    })

    // Add mew "Engineering" department
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__new"]',
                value : 'Engineering',
            },{
                selector        : 'select[name="allowence__new"]',
                option_selector : 'option[value="15"]',
                value : '15',
            }],
            message : /Changes to departments were saved/,
        });
    })

    // Check the order of departments on the page: should be by ID
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Engineering',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Marketing',
            },{
                selector : 'input[name="name__2"]',
                value    : 'Sales',
            }],
        });
    })

    // Edit 'Marketing' department to be 'The marketing'
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name__1"]',
                value : 'The Marketing',
            }],
            elements_to_check : [{
                selector : 'input[name="name__2"]',
                value : 'The Marketing',
            }],
            should_be_successful : true,
            message : /Changes to departments were saved/,
        });
    })

    // Try to remove department that still has users (should fail)
    .then(function(data){
         return submit_form_func({
            driver                 : data.driver,
            submit_button_selector : 'button[value="1"]',
            message : /Cannot remove department Sales as it still has 1 users/,
        });
    })

    // Check that we indeed did not remove any departments
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Engineering',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Sales',
            },{
                selector : 'input[name="name__2"]',
                value    : 'The Marketing',
            }],
        });
    })

    // Remove empty department
    .then(function(data){
         return submit_form_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Sales',
            },{
                selector : 'input[name="name__1"]',
                value    : 'The Marketing',
            }],
            submit_button_selector : 'button[value="0"]',
            message : /Department was successfully removed/,
        });
    })

    // Close browser;
    .then(function(data){
        data.driver.quit().then(function(){ done(); });
    });

  });
});


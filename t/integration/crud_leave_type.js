
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  application_host       = 'http://localhost:3000/',
  new_user_email;


describe('CRUD for leave types', function(){
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

    // Open page with leave types
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/leavetypes/',
            driver : data.driver,
        });
    })

    // Check if there are default leave types
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Try to submit form with incorrect leave type name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name__0"]',
                value    : '<script>Test name',
            }],
            message : /New name of \w+ should contain only letters and numbers/,
        });
    })


    // Try to submit form with incorrect color code
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="color__0"]',
                value    : '<script>Test name',
            }],
            message : /New color for \w+ should be color code/,
        });
    })

    // Make sure that both leave types have "use allowence" tick boxes set
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="use_allowance__0"]',
                tick     : true,
                value    : 'on',
            },{
                selector : 'input[name="use_allowance__1"]',
                tick     : true,
                value    : 'on',
            }],
        });
    })

    // Check that updating "use allowence flag" works
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="use_allowance__1"]',
                tick     : true,
                value    : 'off',
            }],
            should_be_successful : true,
            message : /Changes to leave types were saved/,
        });
    })

    // Double check that "use allowence" tick boxes were updated correctly
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="use_allowance__0"]',
                value    : 'on',
                tick     : true,
            },{
                selector : 'input[name="use_allowance__1"]',
                value    : 'off',
                tick     : true,
            }],
        });
    })

    // Add new leave type
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__new"]',
                value : 'AAAAA',
            },{
                selector : 'input[name="color__new"]',
                value : '121212',
            },{
                selector : 'input[name="use_allowance__new"]',
                value    : 'on',
                tick     : true,
            }],
            message : /Changes to leave types were saved/,
        });
    })

    // Check that new leave type was added at the beginning of the list as it starts with "A"
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'AAAAA',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Holiday',
            },{
                selector : 'input[name="name__2"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Add rename newly added leave type to start with "M"
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : 'input[name="name__0"]',
                value    : 'MM',
            }],
            message : /Changes to leave types were saved/,
        });
    })

    // Make sure that updated new leave type was moved into second position
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : 'input[name="name__1"]',
                value    : 'MM',
            },{
                selector : 'input[name="name__2"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Remove empty newly added leave type
    .then(function(data){
         return submit_form_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Sick Leave',
            }],
            submit_button_selector : 'button[value="1"]',
            message : /Leave type was successfully removed/,
        });
    })

    // And make sure only two old leave types are left
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : 'input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : 'input[name="name__1"]',
                value    : 'Sick Leave',
            }],
        });
    })

    .then(function(data){
        data.driver.quit().then(function(){ done(); });
    });

  }
  );

});

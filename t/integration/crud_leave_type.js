
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  By                     = require('selenium-webdriver').By,
  application_host       = 'http://localhost:3000/',
  leave_type_edit_form_id='#leave_type_edit_form',
  leave_type_new_form_id ='#leave_type_new_form';


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

    // Open page with leave types
    .then(function(data){
        return open_page_func({
            url    : application_host + 'settings/general/',
            driver : data.driver,
        });
    })

    // Check if there are default leave types
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : leave_type_edit_form_id+' input[name="name__1"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Try to submit form with incorrect leave type name
    .then(function(data){
        return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : '<script>Test name',
            }],
            submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
            message : /New name of \w+ should contain only letters and numbers/,
        });
    })


// TODO un comment that step when we resurect editing colors
//    // Try to submit form with incorrect color code
//    .then(function(data){
//        return submit_form_func({
//            driver      : data.driver,
//            form_params : [{
//                selector : leave_type_edit_form_id+' input[name="color__0"]',
//                value    : '<script>Test name',
//            }],
//            submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
//            message : /New color for \w+ should be color code/,
//        });
//    })

    // Make sure that both leave types have "use allowence" tick boxes set
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="use_allowance__0"]',
                tick     : true,
                value    : 'on',
            },{
                selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
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
                selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
                tick     : true,
                value    : 'off',
            }],
            should_be_successful : true,
            submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
            message : /Changes to leave types were saved/,
        });
    })

    // Double check that "use allowence" tick boxes were updated correctly
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="use_allowance__0"]',
                value    : 'on',
                tick     : true,
            },{
                selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
                value    : 'off',
                tick     : true,
            }],
        });
    })

    // Add new leave type
    .then(function(data){
      return data.driver.findElement(By.css('#add_new_leave_type_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

           // This is very important line when working with Bootstrap modals!
           data.driver.sleep(1000);

           return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : leave_type_new_form_id+' input[name="name__new"]',
                value : 'AAAAA',
            },{
                selector : leave_type_new_form_id+' input[name="use_allowance__new"]',
                value    : 'on',
                tick     : true,
            }],
            submit_button_selector : leave_type_new_form_id+' button[type="submit"]',
            message : /Changes to leave types were saved/,
          });
        });
    })

    // Check that new leave type was added at the beginning of the list as it starts with "A"
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_new_form_id+' input[name="name__0"]',
                value    : 'AAAAA',
            },{
                selector : leave_type_new_form_id+' input[name="name__1"]',
                value    : 'Holiday',
            },{
                selector : leave_type_new_form_id+' input[name="name__2"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Add rename newly added leave type to start with "M"
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : 'MM',
            }],
            submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
            message : /Changes to leave types were saved/,
        });
    })

    // Make sure that updated new leave type was moved into second position
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : leave_type_edit_form_id+' input[name="name__1"]',
                value    : 'MM',
            },{
                selector : leave_type_edit_form_id+' input[name="name__2"]',
                value    : 'Sick Leave',
            }],
        });
    })

    // Remove empty newly added leave type
    .then(function(data){
         return submit_form_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : leave_type_edit_form_id+' input[name="name__1"]',
                value    : 'Sick Leave',
            }],
            submit_button_selector : leave_type_edit_form_id+' button[value="1"]',
            message : /Leave type was successfully removed/,
        });
    })

    // And make sure only two old leave types are left
    .then(function(data){
        return check_elements_func({
            driver : data.driver,
            elements_to_check : [{
                selector : leave_type_edit_form_id+' input[name="name__0"]',
                value    : 'Holiday',
            },{
                selector : leave_type_edit_form_id+' input[name="name__1"]',
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

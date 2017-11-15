
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  By                     = require('selenium-webdriver').By,
  config                 = require('../lib/config'),
  application_host       = config.get_application_host(),
  leave_type_edit_form_id='#leave_type_edit_form',
  leave_type_new_form_id ='#leave_type_new_form';


describe('CRUD for leave types', function(){
  var driver;

  this.timeout( config.get_execution_timeout() );

  it("Performing registration process", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
  });

  it("Open page with leave types", function(done){
    open_page_func({
      url    : application_host + 'settings/general/',
      driver : driver,
    })
    .then(function(){ done() });
  })

  it("Check if there are default leave types", function(done){
    check_elements_func({
      driver : driver,
      elements_to_check : [{
        selector : leave_type_edit_form_id+' input[name="name__0"]',
        value    : 'Holiday',
      },{
        selector : leave_type_edit_form_id+' input[name="name__1"]',
        value    : 'Sick Leave',
      }],
    })
    .then(function(){ done() });
  });


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

  it('Make sure that both leave types have "use allowance" tick boxes set', function(done){
    check_elements_func({
      driver : driver,
      elements_to_check : [{
        selector : leave_type_edit_form_id+' input[name="use_allowance__0"]',
        tick     : true,
        value    : 'on',
      },{
        selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
        tick     : true,
        value    : 'off',
      }],
    })
    .then(function(){ done() });
  });

  it('Check that updating "use allowance flag" works', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
        tick     : true,
        value    : 'on',
      }],
      should_be_successful : true,
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      message : /Changes to leave types were saved/,
    })
    .then(function(){ done() });
  });

  it('Double check that "use allowance" tick boxes were updated correctly', function( done ){
    check_elements_func({
      driver : driver,
      elements_to_check : [{
        selector : leave_type_edit_form_id+' input[name="use_allowance__0"]',
        value    : 'on',
        tick     : true,
      },{
        selector : leave_type_edit_form_id+' input[name="use_allowance__1"]',
        value    : 'on',
        tick     : true,
      }],
    })
    .then(function(){ done() });
  });

  it("Check that it is possible to update Limits", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[name="limit__0"]',
        value    : '0',
      },{
        selector : leave_type_edit_form_id+' input[name="limit__1"]',
        value    : '5',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      should_be_successful : true,
      message : /Changes to leave types were saved/,
    })
    .then(function(){ done() });
  });

  it("Make sure that Limit cannot be negative", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[name="limit__0"]',
        value    : '-1',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      message : /New limit for .* should be positive number or 0/,
    })
    .then(function(){ done() });
  });

  it("Add new leave type", function(done){
    driver.findElement(By.css('#add_new_leave_type_btn'))
      .then(function(el){
        return el.click();
      })
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
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
        })
        .then(function(){ done() });
      });
  });

  it('Check that new leave type was added at the beginning of the list as it starts with "A"', function(done){
    check_elements_func({
      driver : driver,
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
    })
    .then(function(){ done() });
  });

  it('Add rename newly added leave type to start with "M"', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : leave_type_edit_form_id+' input[name="name__0"]',
        value    : 'MM',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[type="submit"]',
      message : /Changes to leave types were saved/,
    })
    .then(function(){ done() });
  });

  it("Make sure that updated new leave type was moved into second position", function(done){
    check_elements_func({
      driver : driver,
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
    })
    .then(function(){ done() });
  });

  it("Remove empty newly added leave type", function(done){
    submit_form_func({
      driver : driver,
      elements_to_check : [{
        selector : leave_type_edit_form_id+' input[name="name__0"]',
        value    : 'Holiday',
      },{
        selector : leave_type_edit_form_id+' input[name="name__1"]',
        value    : 'Sick Leave',
      }],
      submit_button_selector : leave_type_edit_form_id+' button[value="1"]',
      message : /Leave type was successfully removed/,
    })
    .then(function(){ done() });
  });

  it("And make sure only two old leave types are left", function(done){
    check_elements_func({
      driver : driver,
      elements_to_check : [{
          selector : leave_type_edit_form_id+' input[name="name__0"]',
          value    : 'Holiday',
      },{
          selector : leave_type_edit_form_id+' input[name="name__1"]',
          value    : 'Sick Leave',
      }],
    })
    .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

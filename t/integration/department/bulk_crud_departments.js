
'use strict';

var test                 = require('selenium-webdriver/testing'),
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func        = require('../../lib/login_with_user'),
  open_page_func         = require('../../lib/open_page'),
  submit_form_func       = require('../../lib/submit_form'),
  check_elements_func    = require('../../lib/check_elements'),
  By                     = require('selenium-webdriver').By,
  config                 = require('../../lib/config'),
  application_host       = config.get_application_host(),
  new_department_form_id = '#add_new_department_form',
  new_user_email;


describe('CRUD for departments', function(){
  var driver, new_user_email;

  this.timeout( config.get_execution_timeout() );


  it("Performing registration process", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      new_user_email = data.email;
      driver = data.driver;
      done();
    });
  });

  it("Open page for departments bulk editing", function(done){
    open_page_func({
      url    : application_host + 'settings/departments-bulk-update/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Update department allowance and Use allowance flag", function(done){
     submit_form_func({
      driver      : driver,
      form_params : [{
        selector        : 'select[name="allowance__0"]',
        option_selector : 'option[value="50"]',
        value : '50',
      },{
        selector : 'input[name="include_public_holidays__0"]',
        tick     : true,
        value    : 'off',
      }],
      message : /Changes to departments were saved/,
    })
    .then(function(){ done() });
  });

  it('... and ensure that changes were saved indeed', function(done){
    open_page_func({
      url    : application_host + 'settings/departments-bulk-update/',
      driver : driver,
    })
    .then(function(){
      return check_elements_func({
        driver            : driver,
        elements_to_check : [{
          selector        : 'select[name="allowance__0"]',
          option_selector : 'option[value="50"]',
          value : '50',
        },{
          selector : 'input[name="include_public_holidays__0"]',
          tick     : true,
          value    : 'off',
        }],
      });
    })
    .then(function(){ done() });
  });

  it("Do check box once again just to check that its value keeps changing", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="include_public_holidays__0"]',
        tick     : true,
        value    : 'on',
      }],
      message : /Changes to departments were saved/,
    })
    .then(function(){
      return open_page_func({
        url    : application_host + 'settings/departments-bulk-update/',
        driver : driver,
      });
    })
    .then(function(){
      return check_elements_func({
        driver            : driver,
        elements_to_check : [{
          selector : 'input[name="include_public_holidays__0"]',
          tick     : true,
          value    : 'on',
        }],
      });
    })
    .then(function(){ done() });
  });


  it('Add mew "Marketing" department', function(done){
    driver.findElement(By.css('#add_new_department_btn'))
      .then(function(el){
        return el.click();
      })
      .then(function(){

         // This is very important line when working with Bootstrap modals!
         driver.sleep(1000);

         submit_form_func({
           driver      : driver,
           form_params : [{
             selector : new_department_form_id+' input[name="name__new"]',
             value : 'Marketing',
           },{
             selector        : new_department_form_id+' select[name="allowance__new"]',
             option_selector : 'option[value="10"]',
             value : '10',
           }],
           submit_button_selector : new_department_form_id+' button[type="submit"]',
           message : /Changes to departments were saved/,
        })
        .then(function(){ done() });
      });
  });

  it('Add mew "Engineering" department', function(done){
    driver.findElement(By.css('#add_new_department_btn'))
      .then(function(el){
        return el.click();
      })
      .then(function(){

        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000);

        submit_form_func({
          driver      : driver,
          form_params : [{
            selector : new_department_form_id+' input[name="name__new"]',
            value : 'Engineering',
          },{
            selector        : new_department_form_id+' select[name="allowance__new"]',
            option_selector : 'option[value="15"]',
            value : '15',
          }],
          submit_button_selector : new_department_form_id+' button[type="submit"]',
          message : /Changes to departments were saved/,
        })
        .then(function(){ done() });
      });
  });

  it("Check the order of departments on the page: should be by ID", function(done){
    open_page_func({
      url    : application_host + 'settings/departments-bulk-update/',
      driver : driver,
    })
    .then(function(){
      return check_elements_func({
        driver : driver,
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
      })
    })
    .then(function(){ done() });
  });

  it("Edit 'Marketing' department to be 'The marketing'", function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="name__1"]',
        value : 'The Marketing',
      }],
      message : /Changes to departments were saved/,
    })
    .then(function(){
      return open_page_func({
        url    : application_host + 'settings/departments-bulk-update/',
        driver : driver,
      });
    })
    .then(function(){
      return check_elements_func({
        driver : driver,
        elements_to_check : [{
          selector : 'input[name="name__2"]',
          value : 'The Marketing',
        }],
      });
    })
    .then(function(){ done() });
  });

  it("Try to remove department that still has users (should fail)", function(done){
    submit_form_func({
      driver                 : driver,
      submit_button_selector : 'button[data-vpp="1"]',
      message : /Cannot remove department Sales as it still has 1 users/,
    })
    .then(function(){
      return open_page_func({
        url    : application_host + 'settings/departments-bulk-update/',
        driver : driver,
      });
    })
    .then(function(){ done() });
  });

  it("Check that we indeed did not remove any departments", function(done){
    check_elements_func({
      driver : driver,
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
    })
    .then(function(){ done() });
  });

  it("Remove empty department", function(done){
    submit_form_func({
      driver : driver,
      submit_button_selector : 'button[data-vpp="0"]',
      message : /Department was successfully removed/,
    })
    .then(function(){
      return open_page_func({
        url    : application_host + 'settings/departments-bulk-update/',
        driver : driver,
      });
    })
    .then(function(){
      return check_elements_func({
        driver : driver,
        elements_to_check : [{
          selector : 'input[name="name__0"]',
          value    : 'Sales',
        },{
          selector : 'input[name="name__1"]',
          value    : 'The Marketing',
        }],
      });
    })
    .then(function(){ done() });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});


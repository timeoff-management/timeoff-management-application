
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  Promise                = require("bluebird"),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  config                 = require('../lib/config'),
  application_host       = config.get_application_host(),
  department_edit_form_id = '#department_edit_form';

/*
 *  Scenario to check:
 *
 *    * Register new account
 *    * Create user ADMIN that is super admin
 *    * Create user MANAGER that is a supervisor of department
 *    * Create user EMPLOYEE
 *    * Go to EMPLOYEE user detail page and remove user,
 *      should be successful
 *    * Go to MANAGER user detail page and try to delete it,
 *      should be error that user is an supervisor and cannot be
 *      removed
 *    * Update corresponding department to have new supervisor
 *    * Go to MANAGER details page again and remove it,
 *      should be successful
 *    * Go to ADMIN user page and try to remove it,
 *      should get an error that such user is an admin
 *    * Remove admin privileges from ADMIN user and try
 *      to remove it again, should be successful
 *
 * */


describe('CRUD for users', function(){

  this.timeout( config.get_execution_timeout() );

  var email_admin   , admin_user_id,
      email_manager , manager_user_id,
      email_employee, employee_user_id,
      driver;

  it('Create new company', function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      driver = data.driver;
      done();
    });
  });


  it("Create ADMIN-to-be user", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      email_admin = data.new_user_email;
      done();
    });
  });

  it("Create MANAGER-to-be user", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      email_manager = data.new_user_email;
      done();
    });
  });

  it("Create EMPLOYEE-to-be user", function(done){
    add_new_user_func({
      application_host : application_host,
      driver           : driver,
    })
    .then(function(data){
      email_employee = data.new_user_email;
      done();
    });
  });

  it("Open department management page", function(done){
    open_page_func({
      url    : application_host + 'settings/departments/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Get the Admin, Manager and Employee IDs", function(done){
    driver.findElement(
      By.css('select[name="boss_id__new"] option:nth-child(2)')
    )
    .then(function(el){
      return el.getAttribute('value');
    })
    .then(function(value){
      admin_user_id = value;
      return driver.findElement(
        By.css('select[name="boss_id__new"] option:nth-child(3)')
      );
    })
    .then(function(el){
      return el.getAttribute('value');
    })
    .then(function(value){
      manager_user_id = value;
      return driver.findElement(
        By.css('select[name="boss_id__new"] option:nth-child(4)')
      );
    })
    .then(function(el){
      return el.getAttribute('value');
    })
    .then(function(value){
      employee_user_id = value;
      [manager_user_id, admin_user_id, employee_user_id].forEach(
        function(id){ expect( id ).to.match(/^\d+$/); }
      );
      done();
    });
  });

  it("And update its boss to be MANAGER", function(done){
    open_page_func({
      url    : application_host + 'settings/departments/',
      driver : driver,
    })
    .then(() => driver
      .findElements(By.css('a[href*="/settings/departments/edit/"]'))
      .then(links => links[0].click())
    )
    .then(() => submit_form_func({
        driver      : driver,
        form_params : [{
          selector : 'input[name="name"]',
          // Just to make sure it is always first in the lists
          value : 'AAAAA',
        },{
          selector        : 'select[name="allowance"]',
          option_selector : 'option[value="15"]',
          value : '15',
        },{
          selector        : 'select[name="boss_id"]',
          option_selector : 'select[name="boss_id"] option:nth-child(3)',
        }],
        submit_button_selector : department_edit_form_id+' button[type="submit"]',
        message : /Department .* was updated/,
      })
    )
    .then(() => done());
  });

  it("Open 'users' page", function(done){
    open_page_func({
      url    : application_host + 'users/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Check that system has 4 users (one currently logged in and 3 added)', function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        expect(elements.length).to.be.equal(4);
        done();
      });
  });

  it("Open EMPLOYEE user details page", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+employee_user_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("And remove account", function(done){
    submit_form_func({
      submit_button_selector : 'button#remove_btn',
      driver : driver,
      message : /Employee records were removed from the system/,
      confirm_dialog : true,
    })
    .then(function(){ done() });
  });

  it("Check that system has 3 users (one currently logged in and 2 added)", function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        expect(elements.length).to.be.equal(3);
        done();
      });
  });

  it("Open MANAGER user details page", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+manager_user_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Try to remove account", function(done){
    submit_form_func({
      submit_button_selector : 'button#remove_btn',
      driver      : driver,
      message : /Cannot remove supervisor/,
      confirm_dialog : true,
    })
    .then(function(){ done() });
  });

  it("Open 'users' page", function(done){
    open_page_func({
      url    : application_host + 'users/',
      driver : driver,
    })
    .then(function(){done() });
  });

  it('Check that system still has 3 users (one currently logged in and 2 added)', function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        expect(elements.length).to.be.equal(3);
        done();
      });
  });

  it('Open departments', function(done){
    open_page_func({
      url    : application_host + 'settings/departments/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('... and update the very first user is an supervisor', function(done){
    open_page_func({
      url    : application_host + 'settings/departments/',
      driver : driver,
    })
    .then(() => driver
      .findElements(By.css('a[href*="/settings/departments/edit/"]'))
      .then(links => links[0].click())
    )
    .then(() => submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="name"]',
        // just to make sure it is always first in the lists
        value : 'aaaaa',
      },{
        selector        : 'select[name="allowance"]',
        option_selector : 'option[value="15"]',
        value : '15',
      },{
        selector        : 'select[name="boss_id"]',
        option_selector : 'select[name="boss_id"] option:nth-child(1)',
      }],
        submit_button_selector : department_edit_form_id+' button[type="submit"]',
        message : /Department .* was updated/,
    }))
    .then(() => done());
  });

  it("Open ex-MANAGER user details page", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+manager_user_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it("Remove account", function(done){
    submit_form_func({
      submit_button_selector : 'button#remove_btn',
      driver      : driver,
      message : /Employee records were removed from the system/,
      confirm_dialog : true,
    })
    .then(function(){ done() });
  });

  it('Check that system does not have ex-MANAGER', function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        // 1 that registered company and other is ADMIN
        expect(elements.length).to.be.equal(2);
        done();
      });
  });

  it("Open ADMIN user details page", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+admin_user_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Make sure that ADMIN has admin privilegues', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="admin"]',
        tick     : true,
        value    : 'on',
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /Details for .+ were updated/,
    })
    .then(function(){ done() });
  });

  it('... and try to remove account', function(done){
    submit_form_func({
      submit_button_selector : 'button#remove_btn',
      driver      : driver,
      message : /Cannot remove administrator user/,
      confirm_dialog : true,
    })
    .then(function(){ done() });
  });

  it("Open 'users' page", function(done){
    open_page_func({
      url    : application_host + 'users/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Check that system still has 2 users (one currently logged in and ADMIN)', function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        expect(elements.length).to.be.equal(2);
        done();
      });
  });

  it("Open ADMIN user details page (absences)", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+admin_user_id+'/absences/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Ensure Adjustment works: check that system prevents from using non-halfs for adjustments', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
          selector : 'input[name="adjustment"]',
          value    : '1.2',
          change_step: true,
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /New allowance adjustment of user should be either whole integer number or with half/,
    })
    .then(function(){ done() });
  });

  it('If the adjustment is with half, it is OK', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="adjustment"]',
        value    : '1.5',
      }],
      submit_button_selector : 'button#save_changes_btn',
      should_be_successful : true,
      message : /Details for .+ were updated/,
    })
    .then(function(){ done() });
  });

  it('If the adjustment is with half and is negative, it is OK', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="adjustment"]',
        value    : '-1.5',
      }],
      submit_button_selector : 'button#save_changes_btn',
      should_be_successful : true,
      message : /Details for .+ were updated/,
    })
    .then(function(){ done() });
  });

  it("Open ADMIN user details page (general)", function(done){
    open_page_func({
      url    : application_host + 'users/edit/'+admin_user_id+'/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Revoke admin rights', function(done){
    submit_form_func({
      driver      : driver,
      form_params : [{
        selector : 'input[name="admin"]',
        tick     : true,
        value    : 'off',
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /Details for .+ were updated/,
    })
    .then(function(){ done() });
  });

  it("Remove account", function(done){
    submit_form_func({
      submit_button_selector : 'button#remove_btn',
      driver      : driver,
      message : /Employee records were removed from the system/,
      confirm_dialog : true,
    })
    .then(function(){ done() });
  });

  it('Check that system has only one - currently logged in user', function(done){
    driver
      .findElements(By.css( 'td.user_department' ))
      .then(function(elements){
        expect(elements.length).to.be.equal(1);
        done();
      });
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});

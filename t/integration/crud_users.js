
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
  application_host       = config.get_application_host();

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

  this.timeout(90000);

  test.it('Go...', function(done){
    var email_admin   , admin_user_id,
        email_manager , manager_user_id,
        email_employee, employee_user_id;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    // Create ADMIN-to-be user
    .then(function(data){
        console.log('  Create ADMIN-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Create MANAGER-to-be user
    .then(function(data){

        email_admin = data.new_user_email;

        console.log('  Create MANAGER-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Create EMPLOYEE-to-be user
    .then(function(data){

        email_manager = data.new_user_email;

        console.log('  Create EMPLOYEE-to-be user');
        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })



    // Open department management page
    .then(function(data){
        email_employee = data.new_user_email;
        console.log('    Create new department');
        return open_page_func({
            url    : application_host + 'settings/departments/',
            driver : data.driver,
        });
    })
    .then(function(data){

      return data.driver.findElement(
        By.css('select[name="boss_id__new"] option:nth-child(2)')
      )
      .then(function(el){
        return el.getAttribute('value');
      })
      .then(function(value){
        admin_user_id = value;
        return data.driver.findElement(
          By.css('select[name="boss_id__new"] option:nth-child(3)')
        );
      })
      .then(function(el){
        return el.getAttribute('value');
      })
      .then(function(value){
        manager_user_id = value;
        return data.driver.findElement(
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
        return Promise.resolve(data);
      });
    })
    .then(function(data){

         console.log('    And update its bose to be MANAGER');

         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__0"]',
                // Just to make sure it is always first in the lists
                value : 'AAAAA',
            },{
                selector        : 'select[name="allowence__0"]',
                option_selector : 'option[value="15"]',
                value : '15',
            },{
                selector        : 'select[name="boss_id__0"]',
                option_selector : 'select[name="boss_id__0"] option:nth-child(3)',
            }],
            message : /Changes to departments were saved/,
        });
    })

    // Open 'users' page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/',
        driver : data.driver,
      });
    })

    // Make sure that all 4 users are shown
    .then(function(data){

      console.log('Check that system has 4 users (one currently logged in and 3 added)');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(4);
          return Promise.resolve(data);
        });
    })

    // Open EMPLOYEE user details page
    .then(function(data){

        console.log('  Open EMPLOYEE details page ...');
        return open_page_func({
            url    : application_host + 'users/edit/'+employee_user_id+'/',
            driver : data.driver,
        });
    })
    // And remove account
    .then(function(data){
      console.log('      ... and remove account');

      return submit_form_func({
          submit_button_selector : 'button#remove_btn',
          driver      : data.driver,
          message : /Employee records were removed from the system/,
      });
    })

    // Make sure that we indeed removed user
    .then(function(data){

      console.log('Check that system has 3 users (one currently logged in and 2 added)');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(3);
          return Promise.resolve(data);
        });
    })

    // Open MANAGER user details page
    .then(function(data){

        console.log('  Open MANAGER details page ...');
        return open_page_func({
            url    : application_host + 'users/edit/'+manager_user_id+'/',
            driver : data.driver,
        });
    })
    // And remove account
    .then(function(data){
      console.log('      ... and try to remove account');

      return submit_form_func({
          submit_button_selector : 'button#remove_btn',
          driver      : data.driver,
          message : /Cannot remove supervisor/,
      });
    })


    // Open 'users' page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/',
        driver : data.driver,
      });
    })

    // Check that system did not remove supervisor
    .then(function(data){

      console.log('Check that system still has 3 users (one currently logged in and 2 added)');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(3);
          return Promise.resolve(data);
        });
    })

    // open department management page
    .then(function(data){
        console.log(' Open departments and update the very first user is an supervisor');
        return open_page_func({
            url    : application_host + 'settings/departments/',
            driver : data.driver,
        });
    })
    .then(function(data){
         return submit_form_func({
            driver      : data.driver,
            form_params : [{
                selector : '#add_new_department_btn',
                tick     : true,
            },{
                selector : 'input[name="name__0"]',
                // just to make sure it is always first in the lists
                value : 'aaaaa',
            },{
                selector        : 'select[name="allowence__0"]',
                option_selector : 'option[value="15"]',
                value : '15',
            },{
                selector        : 'select[name="boss_id__0"]',
                option_selector : 'select[name="boss_id__0"] option:nth-child(1)',
            }],
            message : /changes to departments were saved/i,
        });
    })

    // Open ex-MANAGER user details page
    .then(function(data){

        console.log('  Open ex-MANAGER details page ...');
        return open_page_func({
            url    : application_host + 'users/edit/'+manager_user_id+'/',
            driver : data.driver,
        });
    })
    // And remove account
    .then(function(data){
      console.log('      ... and remove account');

      return submit_form_func({
          submit_button_selector : 'button#remove_btn',
          driver      : data.driver,
          message : /Employee records were removed from the system/,
      });
    })

    // Check that system that MANAGER user was indeed removed
    .then(function(data){

      console.log('Check that system does not have ex-MANAGER');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          // 1 that registered company and other is ADMIN
          expect(elements.length).to.be.equal(2);
          return Promise.resolve(data);
        });
    })

    // Open ADMIN user details page
    .then(function(data){

        console.log('  Open ex-MANAGER details page ...');
        return open_page_func({
            url    : application_host + 'users/edit/'+admin_user_id+'/',
            driver : data.driver,
        });
    })
    .then(function(data){
      console.log('Make sure that ADMIN has admin privilegues');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input[name="admin"]',
            tick     : true,
            value    : 'on',
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .+ were updated/,
      })
    })
    // And remove account
    .then(function(data){
      console.log('      ... and try to remove account');

      return submit_form_func({
          submit_button_selector : 'button#remove_btn',
          driver      : data.driver,
          message : /Cannot remove administrator user/,
      });
    })

    // Open 'users' page
    .then(function(data){
      return open_page_func({
        url    : application_host + 'users/',
        driver : data.driver,
      });
    })

    // Check that system did not remove ADMIN
    .then(function(data){

      console.log('Check that system still has 2 users (one currently logged in and ADMIN)');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(2);
          return Promise.resolve(data);
        });
    })

    // Open ADMIN user details page
    .then(function(data){

        console.log('  Open ADMIN details page ...');
        return open_page_func({
            url    : application_host + 'users/edit/'+admin_user_id+'/',
            driver : data.driver,
        });
    })
    .then(function(data){
      console.log('While we on user edit page lets chek that Adjustment works');
      console.log('  Check that system prevent using non-halfs for adjustments');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input[name="adjustment"]',
            value    : '1.2',
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /New allowance adjustment of user should be either whole integer number or with half/,
      });
    })
    .then(function(data){
      console.log('  If the adjustment is with half, it is OK');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
          selector : 'input[name="adjustment"]',
          value    : '1.5',
        }],
        submit_button_selector : 'button#save_changes_btn',
        should_be_successful : true,
        message : /Details for .+ were updated/,
      });
    })
    .then(function(data){
      console.log('Revoke admin rights');
      return submit_form_func({
        driver      : data.driver,
        form_params : [{
            selector : 'input[name="admin"]',
            tick     : true,
            value    : 'off',
        }],
        submit_button_selector : 'button#save_changes_btn',
        message : /Details for .+ were updated/,
      })
    })
    // And remove account
    .then(function(data){
      console.log('      ... and remove account');

      return submit_form_func({
          submit_button_selector : 'button#remove_btn',
          driver      : data.driver,
          message : /Employee records were removed from the system/,
      });
    })

    // Check that only one - currently logged in - user left
    .then(function(data){

      console.log('Check that system has only one - currently logged in user');

      return data.driver
        .findElements(By.css( 'td.user_department' ))
        .then(function(elements){
          expect(elements.length).to.be.equal(1);
          return Promise.resolve(data);
        });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });
  });

});

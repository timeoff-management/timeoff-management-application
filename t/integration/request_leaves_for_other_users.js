


'use strict';

var test             = require('selenium-webdriver/testing'),
    config           = require('../lib/config'),
    application_host = config.get_application_host(),
    By               = require('selenium-webdriver').By,
    expect           = require('chai').expect,
    _                = require('underscore'),
    Promise          = require("bluebird"),
    until            = require('selenium-webdriver').until,
    login_user_func        = require('../lib/login_with_user'),
    register_new_user_func = require('../lib/register_new_user'),
    logout_user_func       = require('../lib/logout_user'),
    open_page_func         = require('../lib/open_page'),
    submit_form_func       = require('../lib/submit_form'),
    add_new_user_func      = require('../lib/add_new_user'),
    new_department_form_id = '#add_new_department_form';


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create line manager user
 *    - Create new ordenry user
 *    - Create new department
 *    - New department to be managed by line manager user
 *    - Ordernary user belongs to new departmen
 *    - Login with ordenry user and ensure that she can create leave
 *      requests only for herself
 *    - Login as a line manager and make sure she can create leave
 *      requests for herself and ordanry user
 *    - Login as a admin user and make sure she can create leave
 *      request for all users
 *
 *
 * */

describe('Basic leave request', function(){

  this.timeout( config.get_execution_timeout() );

  test.it('Run', function(done){

    var ordenary_user_email, line_manager_email, admin_email,
        ordenary_user_id;

    // Create new company
    return register_new_user_func({
        application_host : application_host,
    })
    // Create new line manager user
    .then(function(data){

        admin_email = data.email;

        console.log('    Login with newly created user');
        console.log('    Create new line manager');

        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Create new ordanry user
    .then(function(data){

        line_manager_email = data.new_user_email;

        console.log('    Create new ordenary user');

        return add_new_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Open department management page
    .then(function(data){
        ordenary_user_email = data.new_user_email;
        console.log('    Create new department');
        return open_page_func({
            url    : application_host + 'settings/departments/',
            driver : data.driver,
        });
    })
    // Save ID of ordenry user
    .then(function(data){

      console.log('    And update its bose');

      return data.driver.findElement(
        By.css('select[name="boss_id__new"] option:nth-child(3)')
      )
      .then(function(el){
        return el.getAttribute('value');
      })
      .then(function(value){
        ordenary_user_id = value;
        expect( ordenary_user_id ).to.match(/^\d+$/);
        return Promise.resolve(data);
      });
    })
    // Add new department and make its approver to be newly added
    // line manager (she is second in a list as users are ordered by AZ)
    .then(function(data){

      return data.driver.findElement(By.css('#add_new_department_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

           // This is very important line when working with Bootstrap modals!
           data.driver.sleep(1000);

           return submit_form_func({
              driver      : data.driver,
              form_params : [{
                  selector : new_department_form_id+' input[name="name__new"]',
                  // Just to make sure it is always first in the lists
                  value : 'AAAAA',
              },{
                  selector        : new_department_form_id+' select[name="allowence__new"]',
                  option_selector : 'option[value="15"]',
                  value : '15',
              },{
                  selector        : new_department_form_id+' select[name="boss_id__new"]',
                  option_selector : 'select[name="boss_id__new"] option:nth-child(2)',
              }],
              submit_button_selector : new_department_form_id+' button[type="submit"]',
              message : /Changes to departments were saved/,
          });
        });
    })
    // Open user editing page for ordenry user
    .then(function(data){

        console.log('    Make sure ordenary user is part of newly added department. Open page...');
        return open_page_func({
            url    : application_host + 'users/edit/'+ordenary_user_id+'/',
            driver : data.driver,
        });
    })
    // And make sure it is part of the newly added department
    .then(function(data){
      console.log('      ... and save changes');

      return submit_form_func({
          submit_button_selector : 'button#save_changes_btn',
          driver      : data.driver,
          form_params : [{
              selector : 'select[name="department"]',
              // Newly added department should be first in the list as it is
              // sorted by AZ and department started with AA
              option_selector : 'select[name="department"] option:nth-child(1)',
          }],
          message : /Details for .* were updated/,
      });
    })

    // Logout from admin acount
    .then(function(data){
        console.log('    Log out from admin user');

        return logout_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })
    // Login as ordenary user
    .then(function(data){
        return login_user_func({
            application_host : application_host,
            user_email       : ordenary_user_email,
            driver           : data.driver,
        });
    })

    // Open calendar page
    .then(function(data){
        return open_page_func({
            url    : application_host + 'calendar/?show_full_year=1&year=2015',
            driver : data.driver,
        });
    })
    // And make sure that user cannot select other users when requesting new leave
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          return driver.isElementPresent(By.css('select#employee'))
            .then(function(is_present){
              expect(is_present).to.be.equal(false);
            });
        })
        .then(function(){ return Promise.resolve(data); });
    })
    // Logout from ordenary acount
    .then(function(data){
        return logout_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })

    // Login as line manager user
    .then(function(data){
        return login_user_func({
            application_host : application_host,
            user_email       : line_manager_email,
            driver           : data.driver,
        });
    })
    // Open calendar page
    .then(function(data){
        return open_page_func({
            url    : application_host + 'calendar/?show_full_year=1&year=2015',
            driver : data.driver,
        });
    })
    // And make sure that user can select herself and ordenary user (because she
    // belongs to the department managed by current line manager)
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          // Make sure there is a drop down with users
          return driver.isElementPresent(By.css('select#employee'))
            .then(function(is_present){
              expect(is_present).to.be.equal(true);
            });
        })
        .then(function(){

          // Make sure there are two records in it
          return driver.findElements(By.css('select#employee option'))
            .then(function(elements){
              expect( elements.length ).to.be.equal(2);
            });
        })
        .then(function(){

          // Make sure ordenary user is in that drop down list
          return driver.findElement(
              By.css('select#employee option:nth-child(2)')
            )
            .then(function(el){
              return el.getInnerHtml();
            })
            .then(function(text){
              expect( text ).to.match( new RegExp(
                 ordenary_user_email.substring(0,ordenary_user_email.lastIndexOf('@'))
               ));
            });
        })
        .then(function(){ return Promise.resolve(data); });
    })
    // Logout from ordenary acount
    .then(function(data){
        return logout_user_func({
            application_host : application_host,
            driver           : data.driver,
        });
    })

    // Login as admin user
    .then(function(data){
        return login_user_func({
            application_host : application_host,
            user_email       : admin_email,
            driver           : data.driver,
        });
    })
    // Open calendar page
    .then(function(data){
        return open_page_func({
            url    : application_host + 'calendar/?show_full_year=1&year=2015',
            driver : data.driver,
        });
    })
    // And make sure that user can select all three users
    .then(function(data){
      var driver = data.driver;

      return driver.findElement(By.css('#book_time_off_btn'))
        .then(function(el){
          return el.click();
        })
        .then(function(){

          // This is very important line when working with Bootstrap modals!
          driver.sleep(1000);

          // Make sure there is a drop down with users
          return driver.isElementPresent(By.css('select#employee'))
            .then(function(is_present){
              expect(is_present).to.be.equal(true);
            });
        })
        .then(function(){

          // Make sure there are three records in it (all users for company)
          return driver.findElements(By.css('select#employee option'))
            .then(function(elements){
              expect( elements.length ).to.be.equal(3);
            });
        })
        .then(function(){ return Promise.resolve(data); });
    })

    .then(function(data){ return data.driver.quit(); })
    .then(function(){ done(); });

  }); // End of test
});


'use strict';


var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  Promise                = require("bluebird"),
  until                  = require('selenium-webdriver').until,
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  check_elements_func    = require('../lib/check_elements'),
  add_new_user_func      = require('../lib/add_new_user'),
  By                     = require('selenium-webdriver').By,
  new_department_form_id = '#add_new_department_form',
  application_host       = 'http://localhost:3000/';

/*
 *  Scenario to check that filtering by department feature on users page.
 *
 *    * register new company with admin user;
 *    * create new departmen: "IT"
 *    * create new user, place it into newly created department
 *    * open "users" page and make sure there are both there
 *    * click "Sales" department link and make sure that only admin user is presented
 *    * click "IT" department and make sure only second user is visible
 *    * click "All" and make sure that both users are presented
 *
 * */

describe('Check filtering on "users" page', function(){
    var driver;

    this.timeout(60000);

    test.it('Go', function(done){

        // Performing registration process
        register_new_user_func({
            application_host : application_host,
        })

        // Create new department: "IT"
        .then(function(data){
            return open_page_func({
                url    : application_host + 'settings/departments/',
                driver : data.driver,
            });
        })
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
                    value : 'IT',
                },{
                    selector        : new_department_form_id+' select[name="allowence__new"]',
                    option_selector : 'option[value="10"]',
                    value : '10',
                }],
                submit_button_selector : new_department_form_id+' button[type="submit"]',
                message : /Changes to departments were saved/,
              });
            });
        })

        // Create new non-admin user
        .then(function(data){
            return add_new_user_func({
                application_host : application_host,
                driver           : data.driver,
                // We know that departments are ordered alphabetically, so newly
                // added "ID" is before default "Sales" one
                department_index : "0",
            });
        })

        // Open 'users' page
        .then(function(data){
            return open_page_func({
                url    : application_host + 'users/',
                driver : data.driver,
            });
        })

        // Make sure that both users are shown
        .then(function(data){
            return data.driver
                .findElements(By.css( 'div.user_department' ))
                .then(function(elements){
                    expect(elements.length).to.be.equal(2);
                    return Promise.resolve(data);
                });
        })

        // Click on IT department and make sure only user from IT department is shown
        .then(function(data){
            return data.driver
                // Departments are ordered by names so we are sure that first item
                // after general link "All" is going to be "IT"
                .findElement( By.css('ul.all-departments li:nth-child(2) a') )
                .then(function(element){
                    element.click();
                    data.driver.wait(until.elementLocated(By.css('h1')), 1000);
                    return Promise.resolve(data);
                })
        })
        .then(function(data){
            return data.driver
                .findElements(By.css( 'div.user_department' ))
                .then(function(elements){
                    expect(elements.length).to.be.equal(1);
                    return elements[0].getText();
                })
                .then(function(text){
                    expect(text).to.be.equal('IT');
                    return Promise.resolve(data);
                });
        })

        // Click on "Sales" department and make sure that only one user from that
        // department is shown
        .then(function(data){
            return data.driver
                // Departments are ordered by names so we are sure that second item
                // after general link "All" is going to be "Sales"
                .findElement( By.css('ul.all-departments li:nth-child(3) a') ) 
                .then(function(element){
                    element.click();
                    data.driver.wait(until.elementLocated(By.css('h1')), 1000);
                    return Promise.resolve(data);
                })
        })
        .then(function(data){
            return data.driver
                .findElements(By.css( 'div.user_department' ))
                .then(function(elements){
                    expect(elements.length).to.be.equal(1);
                    return elements[0].getText();
                })
                .then(function(text){
                    expect(text).to.be.equal('Sales'); 
                    return Promise.resolve(data);
                });
        })

        // Click on "All" filter and make sure that both users are presenyed
        .then(function(data){
            return data.driver
                .findElement( By.css('ul.all-departments li:nth-child(1) a') ) 
                .then(function(element){
                    element.click();
                    data.driver.wait(until.elementLocated(By.css('h1')), 1000);
                    return Promise.resolve(data);
                })
        })
        .then(function(data){
            return data.driver
                .findElements(By.css( 'div.user_department' ))
                .then(function(elements){
                    expect(elements.length).to.be.equal(2);
                    return Promise.resolve(data);
                });
        })

        // Close the browser
        .then(function(data){
            data.driver.quit().then(function(){ done(); });
        });

    });
});

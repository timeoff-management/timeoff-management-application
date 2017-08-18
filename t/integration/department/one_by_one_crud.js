
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
  expect                 = require('chai').expect,
  new_department_form_id = '#add_new_department_form';

/*
 *  Scenario:
 *    * register new account
 *    * check that /settings/departments/ page shows readonly list of departments
 *
 *    * ensure that the list of departments has links for every department
 *
 *    ** to edit department
 *    ** see details of its manager
 *    ** there is a link to Bulk department update page
 *    * create new department by pressing "Add new department" button on the /settings/departments/ page
 *    ** ensure that user is landed on department read only list page
 *    ** use A as a name and ensure it appears in the begining of the list
 *    * create another new department starting with "Z"
 *    ** ensure that it is located at the end of the list
 *
 * */

describe('Check list of departments page', function(){
  var driver, user_email;

  this.timeout( config.get_execution_timeout() );

  it("Register new account", function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(function(data){
      user_email = data.email;
      driver     = data.driver;
      done();
    });
  });

  it("Open page with department list and ensure it has read-only list", function(done){
    open_page_func({
      url    : application_host + 'settings/departments/',
      driver : driver,
    })
    .then(function(){
      return driver.findElements(By.css('tr[data-vpp-department-list-mode="readonly"]'));
    })
    .then(function(inputs){
      expect(inputs.length).to.be.eq(1);
      done();
    });
  });

  it("Ensure list of departments has links for editing each individual one", function(done){
  
  });

  after(function(done){
    driver.quit().then(function(){ done(); });
  });
});


/*
 *  Scenario:
 *    * create new company account
 *    * create additional user B
 *    * go to existing department
 *    * try to edit name, manager - to be user B, allowance to be 5 and tick the "include public holidays" checkbox
 *    * ensure user stays on the department edit oage after changes were saved
 *    * try to remove the department by pressing Delete button on current page
 *    ** ensure that system prevents form doint it complaining that there are people in this department
 *    * create new department and move both users A and B into it
 *    * delete the original department and make sure it is gone
 *    * go to details of newly added department and check the link 'Employees from department'
 *
 * */

/*
 *  Scenario (edditing secondary supervisers)
 *  * create new account with user A
 *  * go to departments details page and invoke "add secondary supervisors"
 *    popup window, ensure it has link to "Add new employee" page
 *  * create two additional users B and C
 *  * go to any department details page and ensure that user A is its manager
 *  * ensure that "secondary supervisors" section is empty"
 *  * click "add supervisers" button and ansure that popup witndow
 *    has only user B and C in the list
 *  * tick user B and save changes
 *  * observe that user B appeares on the list of secondary supervisers
 *  * open "add supervisors" pop up again and ensure that user B has tick
 *    next to it and user C does not have it
 *  * tick user C and un-tick user B and save changes
 *  * observe that "secondary spervisors" section now contains only user C
 *  * Click on "Remove" button next to user C and observe that it disappeares
 *    from "secondary supervisors" section after page is reloaded
 *
 * */

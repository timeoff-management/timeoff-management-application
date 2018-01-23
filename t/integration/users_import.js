
'use strict';

var test                 = require('selenium-webdriver/testing'),
  By                     = require('selenium-webdriver').By,
  expect                 = require('chai').expect,
  _                      = require('underscore'),
  Promise                = require("bluebird"),
  fs                     = Promise.promisifyAll(require('fs')),
  csv                    = Promise.promisifyAll(require('csv')),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func        = require('../lib/login_with_user'),
  open_page_func         = require('../lib/open_page'),
  submit_form_func       = require('../lib/submit_form'),
  add_new_user_func      = require('../lib/add_new_user'),
  config                 = require('../lib/config'),
  user_info_func         = require('../lib/user_info'),
  application_host       = config.get_application_host();

/*
 *  Scenario to check:
 *
 *    * Register new account
 *    * Create 10 unique emails/users
 *    * Put them into CSV and import in bulk
 *    * Ensure that all users were added into
 *      system and they appear on the Users page
 *
 * */


describe('Bulk import of users', function(){

  this.timeout( config.get_execution_timeout() );

  let email_admin,
      driver,
      csv_data,
      test_users_filename =  __dirname +'/../test.csv';

  it('Create new company', function(done){
    register_new_user_func({
      application_host : application_host,
    })
    .then(data => {
      driver = data.driver;
      done();
    });
  });

  it('Navigate to bulk upload page', function(done){
    open_page_func({
      url    : application_host + 'users/import/',
      driver : driver,
    })
    .then(function(){ done() });
  });

  it('Create test .CSV file for the test', function(done){
    csv_data = [['email', 'name', 'lastname', 'department']];

    let token = (new Date()).getTime();
    for (let i=0; i<10; i++){
      csv_data.push([
        'test_csv_'+i+'_'+token+'@test.com',
        'name_csv_'+i+'_'+token+'@test.com',
        'lastname_csv_'+i+'_'+token+'@test.com',
        'Sales'
      ]);
    }

    Promise.resolve()
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(err => Promise.resolve())
      .then(() => csv.stringifyAsync( csv_data ))
      .then(data => fs.writeFileAsync(test_users_filename, data))
      .then(() => done());
  });

  it('Upload user import file', function(done){
    let regex = new RegExp(
      'Successfully imported users with following emails: '
      + csv_data.slice(1).map(it => it[0]).sort().join(', ')
    );

    submit_form_func({
      submit_button_selector : '#submit_users_btn',
      driver : driver,
      form_params : [{
        selector : '#users_input_inp',
        value    : test_users_filename,
        file     : true,
      }],
      message : regex,
    })
    .then(() => done());
  });

  it('Ensure that imported users are in the system', function(done){
    let users_ids;
    // Get IDs of newly added users
    Promise.map(csv_data.slice(1).map(it => it[0]), email => {
      return user_info_func({
        driver : driver,
        email : email,
      })
      .then(data => data.user.id);
    })
    // Open users page
    .then(ids => {
      users_ids = ids;

      return open_page_func({
        url    : application_host + 'users/',
        driver : driver,
      });
    })

    // Ensure that IDs of newly added users are on th Users page
    .then(() => Promise.map(users_ids, id => driver
      .findElement(By.css('[data-vpp-user-row="'+id+'"]'))
      .then(el => {
        expect(el, 'Ensure that newly added user ID '+id+' exists on Users page')
          .to.exists;
        return Promise.resolve();
      })
    ))

    .then(() => done());
  });

  after(function(done){
    Promise.resolve()
      .then(() => driver.quit())
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(err => Promise.resolve())
      .then(() => done());
  });
});

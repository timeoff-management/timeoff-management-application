
/*
 * Exporst function that checks if given emails of users are shown
 * on the Teamview page. And if so how they are rendered: as text or link
 *
 * */

'use strict';

var
  By             = require('selenium-webdriver').By,
  expect         = require('chai').expect,
  open_page_func = require('../lib/open_page'),
  bluebird        = require("bluebird");

module.exports = bluebird.promisify( function(args, callback){

  var
    result_callback = callback,
    driver          = args.driver,
    emails          = args.emails || [],
    is_link         = args.is_link || false,
    application_host = args.application_host || 'http://localhost:3000/';

  if ( ! driver ) {
    throw "'driver' was not passed into the teamview_check_user!";
  }

  return open_page_func({
    url    : application_host + 'calendar/teamview/',
    driver : driver,
  })

  .then(function(data){
    return data.driver
      .findElements(By.css( 'tr.teamview-user-list-row > td > ' + (is_link ? 'a' : 'span') ))
      .then(function(elements){
        expect(elements.length).to.be.equal( emails.length );
        return bluebird.resolve(data);
      });
  })

  .then(function(data){
    // "export" current driver
    result_callback(
      null,
      {
        driver : data.driver,
      }
    );
  });

});


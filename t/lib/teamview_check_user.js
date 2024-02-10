/*
 * Exports function that checks if given emails of users are shown
 * on the Teamview page. And if so how they are rendered: as text or link.
 *
 * It does not check exact emails, just count numbers.
 *
 * */

'use strict'

const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const open_page_func = require('./open_page');
  const config = require('./config');
  const bluebird = require('bluebird')

module.exports = bluebird.promisify(function(args, callback) {
  const result_callback = callback;
    const driver = args.driver;
    const emails = args.emails || [];
    const is_link = args.is_link || false;
    const application_host = args.application_host || config.get_application_host()

  if (!driver) {
    throw "'driver' was not passed into the teamview_check_user!"
  }

  return open_page_func({
    url: application_host + 'calendar/teamview/',
    driver
  })
    .then(function(data) {
      return data.driver
        .findElements(
          By.css(
            'tr.teamview-user-list-row > td.cross-link > ' +
              (is_link ? 'a' : 'span')
          )
        )
        .then(function(elements) {
          expect(elements.length).to.be.equal(emails.length)
          return bluebird.resolve(data)
        })
    })

    .then(function(data) {
      // "export" current driver
      result_callback(null, {
        driver: data.driver
      })
    })
})

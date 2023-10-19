'use strict'

const webdriver = require('selenium-webdriver');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const until = require('selenium-webdriver').until;
  const Promise = require('bluebird')

const logout_user_func = Promise.promisify(function(args, callback) {
  const application_host = args.application_host;
    const driver = args.driver;
    const result_callback = callback;
    const logout_link_css_selector = 'li.hidden-xs a[href="/logout/"]'

  // Open front page
  driver.get(application_host)

  driver
    .findElement(By.css('a#me_menu'))
    .then(function(el) {
      return el.click()
    })
    // Make sure that Logout link exists
    .then(function() {
      return driver.isElementPresent(By.css(logout_link_css_selector))
    })
    .then(function(is_present) {
      expect(is_present).to.be.equal(true)
    })

  // Click logout link
  driver
    .findElement(By.css(logout_link_css_selector))
    .then(function(el) {
      return el.click()
    })
    .then(function() {
      driver.wait(until.elementLocated(By.css('body')), 1000)

      return driver.isElementPresent(By.css(logout_link_css_selector))
    })
    // Check that there is no more Logout link
    .then(function(is_present) {
      expect(is_present).to.be.equal(false)

      // "export" current driver
      result_callback(null, {
        driver
      })
    })
})

module.exports = function(args) {
  return args.driver.call(function() {
    return logout_user_func(args)
  })
}

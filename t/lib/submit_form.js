'use strict'

const webdriver = require('selenium-webdriver');
  const By = require('selenium-webdriver').By;
  const Key = require('selenium-webdriver').Key;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const until = require('selenium-webdriver').until;
  const check_elements = require('./check_elements')

const submit_form_func = Promise.promisify(function(args, callback) {
  let driver = args.driver;
    const result_callback = callback;
    // Regex to check the message that is shown after form is submitted
    const message = args.message || /.*/;
    // Array of object that have at least two keys: selector - css selector
    // and value - value to be entered
    const form_params = args.form_params || [];
    // Defined how elemts are going to be checked in case of success,
    // if that parameter is omitted - 'form_params' is used instead
    const elements_to_check = args.elements_to_check || form_params;
    // Indicates whether form submission is going to be successful
    const should_be_successful = args.should_be_successful || false;
    // Indicate if message to be searched through all messages shown,
    // bu defaul it looks into firts message only
    const multi_line_message = args.multi_line_message || false;
    // Indicates if there is a confirmation dialog
    const confirm_dialog = args.confirm_dialog || false;
    // CSS selecetor for form submition button
    const submit_button_selector =
      args.submit_button_selector || 'button[type="submit"]'

  driver.call(function() {
    // Enter form parameters
    Promise.all([
      _.map(form_params, function(test_case) {
        // Handle case when test case is empty
        if (Object.keys(test_case).length === 0) {
          return Promise.resolve(1)
        }

        driver.findElement(By.css(test_case.selector)).then(function(el) {
          if (test_case.hasOwnProperty('option_selector')) {
            el.click()
            return el
              .findElement(By.css(test_case.option_selector))
              .then(function(el) {
                return el.click()
              })
          } else if (test_case.hasOwnProperty('tick')) {
            return el.click()
          } else if (test_case.file) {
            return Promise.resolve().then(() => el.sendKeys(test_case.value))
          } else if (test_case.hasOwnProperty('dropdown_option')) {
            return el
              .click()
              .then(() => driver.findElement(By.css(test_case.dropdown_option)))
              .then(dd => dd.click())
          } else {
            // Prevent the browser validations to allow backend validations to occur
            if (test_case.change_step) {
              driver.executeScript("return arguments[0].step = '0.1'", el)
            }

            return el.clear().then(function() {
              el.sendKeys(test_case.value)
              // Tabs to trigger the calendars overlays
              // to close so the modal submit button can be clicked
              el.sendKeys(Key.TAB)
            })
          }
        })
      })
    ])
  })

  // Accept the confirm dialog
  if (confirm_dialog) {
    driver.executeScript('window.confirm = function(msg) { return true; }')
  }

  // Submit the form
  driver.findElement(By.css(submit_button_selector)).then(function(el) {
    el.click()

    driver.wait(until.elementLocated(By.css('title')), 1000)
  })

  // TODO this is not doing what it supposed to be doing
  if (should_be_successful) {
    driver.call(function() {
      Promise.resolve(
        check_elements({
          driver,
          elements_to_check
        }).then(function(data) {
          driver = data.driver
        })
      )
    })
  }

  // Check that message is as expected
  if (multi_line_message) {
    driver.findElements(By.css('div.alert')).then(function(els) {
      return Promise.all(
        _.map(els, function(el) {
          return el.getText()
        })
      ).then(function(texts) {
        expect(
          _.any(texts, function(text) {
            return message.test(text)
          })
        ).to.be.equal(true)

        // "export" current driver
        result_callback(null, {
          driver
        })
      })
    })
  } else {
    driver
      .findElement(By.css('div.alert'))
      .then(function(el) {
        return el.getText()
      })

      .then(function(text) {
        expect(text).to.match(message)

        // "export" current driver
        result_callback(null, {
          driver
        })
      })
  }
})

module.exports = function(args) {
  return args.driver.call(function() {
    return submit_form_func(args)
  })
}

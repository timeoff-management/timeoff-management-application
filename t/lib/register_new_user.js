/*

*/

'use strict'

const By = require('selenium-webdriver').By
const until = require('selenium-webdriver').until
const expect = require('chai').expect
const Promise = require('bluebird')
const open_page_func = require('./open_page')
const build_driver = require('./build_driver')
const company_edit_form_id = '#company_edit_form'
const submit_form_func = require('./submit_form')

const register_new_user_func = Promise.promisify(function(args, callback) {
  const application_host = args.application_host || args.applicationHost
  const failing_error_message = args.failing_error_message
  const default_date_format = args.default_date_format
  const random_token = new Date().getTime()
  const new_user_email = args.user_email || random_token + '@test.com'

  // Instantiate new driver object if it not provided as paramater
  const driver = args.driver || build_driver()

  // Make sure we are in desktop version
  // driver.manage().window().setSize(1024, 768);

  // Go to front page
  driver.get(application_host)

  driver.wait(until.elementLocated(By.css('h1')), 1000)

  // Check if there is a registration link
  driver
    .findElement(By.css('a[href="/register/"]'))
    .then(function(el) {
      return el.getText()
    })
    .then(function(text) {
      expect(text).to.match(/Register new company/i)
    })

  // Click on registration link
  driver.findElement(By.css('a[href="/register/"]')).then(function(el) {
    el.click()
  })

  driver.wait(until.elementLocated(By.css('h1')), 1000)

  // Make sure that new page is a registration page
  driver
    .findElement(By.css('h1'))
    .then(function(el) {
      return el.getText()
    })
    .then(function(ee) {
      expect(ee).to.be.equal('New company')
    })

  driver.call(() =>
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="company_name"]',
          value: 'Company ' + new Date().getTime()
        },
        {
          selector: 'input[name="name"]',
          value: 'name' + random_token
        },
        {
          selector: 'input[name="lastname"]',
          value: 'lastname' + random_token
        },
        {
          selector: 'input[name="email"]',
          value: new_user_email
        },
        {
          selector: 'input[name="password"]',
          value: '123456'
        },
        {
          selector: 'input[name="password_confirmed"]',
          value: '123456'
        },
        {
          selector: 'select[name="country"]',
          option_selector: 'option[value="ZZ"]'
        }
      ],
      submit_button_selector: '#submit_registration'
    })
  )

  driver.wait(until.elementLocated(By.css('div')), 1000)

  if (failing_error_message) {
    driver
      .findElement(By.css('div.alert-danger'))
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.equal(failing_error_message)
      })
  } else {
    // Make sure registration completed successfully
    driver
      .findElement(By.css('div.alert-success'))
      .then(function(el) {
        return el.getText()
      })
      .then(function(text) {
        expect(text).to.be.equal('Registration is complete.')
      })
  }

  if (default_date_format) {
    // open company general configuration page and set the default format to be as requested
    driver.call(function() {
      return open_page_func({
        url: application_host + 'settings/general/',
        driver
      })
    })

    // update company to use provided date format as a default
    driver.call(function() {
      return submit_form_func({
        driver,
        form_params: [
          {
            selector: company_edit_form_id + ' select[name="date_format"]',
            option_selector: 'option[value="' + default_date_format + '"]',
            value: default_date_format
          }
        ],
        submit_button_selector: company_edit_form_id + ' button[type="submit"]',
        message: /successfully/i,
        should_be_successful: true
      })
    })
  }

  // Pass data back to the caller
  driver.get(application_host).then(function() {
    callback(null, {
      driver,
      email: new_user_email
    })
  })
})

module.exports = function(args) {
  if (args.driver) {
    return args.driver.call(function() {
      return register_new_user_func(args)
    })
  }

  const result = register_new_user_func(args)
  return result
}

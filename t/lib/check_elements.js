'use strict'

const webdriver = require('selenium-webdriver');
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird')

const check_elements_func = Promise.promisify(function(args, callback) {
  const driver = args.driver;
    const result_callback = callback;
    const elements_to_check = args.elements_to_check || []

  Promise.all([
    _.map(elements_to_check, function(test_case) {
      driver
        .findElement(By.css(test_case.selector))
        .then(function(el) {
          if (test_case.hasOwnProperty('tick')) {
            return el.isSelected().then(function(yes) {
              return Promise.resolve(yes ? 'on' : 'off')
            })
          } else {
            return el.getAttribute('value')
          }
        })
        .then(function(text) {
          expect(text).to.be.equal(test_case.value)
        })
    })
  ]).then(function() {
    // "export" current driver
    result_callback(null, {
      driver
    })
  })
})

module.exports = function(args) {
  return args.driver.call(function() {
    return check_elements_func(args)
  })
}

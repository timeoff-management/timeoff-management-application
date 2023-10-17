'use strict'

var webdriver = require('selenium-webdriver'),
  By = require('selenium-webdriver').By,
  expect = require('chai').expect,
  _ = require('underscore'),
  Promise = require('bluebird')

var check_elements_func = Promise.promisify(function(args, callback) {
  var driver = args.driver,
    result_callback = callback,
    elements_to_check = args.elements_to_check || []

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
      driver: driver
    })
  })
})

module.exports = function(args) {
  return args.driver.call(function() {
    return check_elements_func(args)
  })
}

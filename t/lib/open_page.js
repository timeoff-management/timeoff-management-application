'use strict'

const webdriver = require('selenium-webdriver')
const Promise = require('bluebird')

module.exports = Promise.promisify((args, callback) => {
  const url = args.url
  const driver = args.driver
  const result_callback = callback

  // Open front page
  driver.get(url).then(() => {
    // "export" current driver
    result_callback(null, {
      driver
    })
  })
})

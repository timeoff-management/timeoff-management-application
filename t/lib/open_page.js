'use strict'

const Promise = require('bluebird')

module.exports = Promise.promisify(({ url, driver }, callback) => {
  // Open front page
  driver.get(url).then(() => {
    // "export" current driver
    callback(null, {
      driver
    })
  })
})

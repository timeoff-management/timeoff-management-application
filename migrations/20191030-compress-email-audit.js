'use strict'

const htmlToText = require('html-to-text');
  const Promise = require('bluebird');
  const models = require('../lib/model/db')

module.exports = {
  up: () => models.EmailAudit.findAll()
      .map(rec => rec.update({ body: htmlToText.fromString(rec.body) }), {
        concurrency: 1
      })
      .then(() => console.log('Done!')),

  // Do nothing
  down: () => Promise.resolve()
}

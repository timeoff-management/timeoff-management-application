/*
 * Class whose instances are mocked ExpressJS request objects.
 *
 * */
'use strict'

module.exports = function(args) {
  if (!args) args = {}

  const params = args.params || {};
    const error_messages = []

  const req = {
    session: {},
    user: {
      company: {
        get_default_date_format: function() {
          'YYYY-MM-DD'
        },
        normalise_date: function(date) {
          return date
        }
      }
    },
    body: params,
    query: params,
    param: function(key) {
      return params[key]
    }
  }

  // Make request be aware of flash messages
  require('../../lib/middleware/flash_messages')(
    req,
    { locals: {} },
    function() {}
  )

  return req
}

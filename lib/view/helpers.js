'use strict'

const moment = require('moment')
const moment_tz = require('moment-timezone')
const config = require('../config')

const as_date_formatted = function(date_str, format, options) {
  if (!date_str) return ''

  if (!format) {
    format = get_current_format(options)
  }

  // Special case when we have to take time zone into consideration
  // when printing date (usually it is needed for those dates recorded
  // automatically as UTC time stampts)
  if (options.tom_take_timezone_into_consideration) {
    return moment_tz
      .utc(date_str)
      .tz(get_timezone(options))
      .format(format)
  }

  return moment.utc(date_str).format(format)
}

// Note: that currently it returns only truely value of given property, that is if there property
// exists and its value is falsy, that undef is returned back
const get_property_from_options = function(options, property_name) {
  let value

  if (
    options.hasOwnProperty('data') &&
    options.data.hasOwnProperty('root') &&
    options.data.root.hasOwnProperty(property_name) &&
    options.data.root[property_name]
  ) {
    value = options.data.root[property_name]
  }

  return value
}

var get_current_format = function(options) {
  let format = 'YYYY-MM-DD'

  const user =
    get_property_from_options(options, 'logged_user') ||
    get_property_from_options(options, 'user')

  if (user && user.hasOwnProperty('company')) {
    format = user.company.get_default_date_format()
  }

  return format
}

var get_timezone = function(options) {
  let timezone = 'Europe/London'

  const user =
    get_property_from_options(options, 'logged_user') ||
    get_property_from_options(options, 'user')

  if (user && user.hasOwnProperty('company')) {
    timezone = user.company.timezone
  }

  return timezone
}

module.exports = function() {
  return {
    // Handlebars does not allow to have conditions in IF, here is
    // workaround picked from here: http://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
    if_equal: function(v1, v2, options) {
      if (v1 === v2) {
        return options.fn(this)
      }
      return options.inverse(this)
    },

    // Given string with UTC date return string with date formated in customer specific manner
    as_date: function(date_string, options) {
      return as_date_formatted(date_string, undefined, options)
    },

    // Return string with given date formated as a timestamp
    as_datetime: function(date_str, options) {
      return as_date_formatted(
        date_str,
        get_current_format(options) + ' HH:mm:ss',
        options
      )
    },

    // Do the same as "as_date" method but takes into consideration of company
    // timezone. It is needed for rendering dates that were recorded in database
    // automatically in UTC, dates that were recorded based on explicit input
    // from users should not be used with this method (but with "as_date" instead)
    as_date_from_timestamp: function(date_string, options) {
      // Add custom flag to options so further down the call stack
      // we would know that date needs to be corrected with
      // current timezone
      options.tom_take_timezone_into_consideration = true

      return as_date_formatted(date_string, undefined, options)
    },

    // Similar to "as_datetime" but with the same twist as "as_date_from_timestamp"
    as_datetime_from_timestamp: function(date_str, options) {
      // Add custom flag to options so further down the call stack
      // we would know that date needs to be corrected with
      // current timezone
      options.tom_take_timezone_into_consideration = true

      return as_date_formatted(
        date_str,
        get_current_format(options) + ' HH:mm:ss',
        options
      )
    },

    // Given string with UTC date and string with moment.js format return corresponding string
    as_date_formatted,

    // Get access to config value holding application domain
    get_application_domain: function() {
      return config.get('application_domain')
    },

    // Return URL to the web site with promotion materials for TimeOff.Management
    get_promotion_website_domain: function() {
      return config.get('promotion_website_domain')
    },

    concatenate: function() {
      const arg = Array.prototype.slice.call(arguments, 0)
      arg.pop()
      return arg.join('')
    },

    ga_tracker: config.get('ga_tracker'),
    // Should we include Google Analitics snipet?
    // (based on application config)
    is_ga_analitics_on: function(options) {
      if (config.get('ga_tracker')) {
        return options.fn(this)
      }

      return options.inverse(this)
    },

    is_force_to_explicitly_select_type_when_requesting_new_leave: function(
      options
    ) {
      if (
        config.get(
          'force_to_explicitly_select_type_when_requesting_new_leave'
        )
      ) {
        return options.fn(this)
      }

      return options.inverse(this)
    }
  }
}

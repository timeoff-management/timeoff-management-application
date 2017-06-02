
"use strict";

var
  moment = require('moment-timezone'),
  config = require('../config');

var as_date_formatted = function(date_str, format, options) {

  if (! date_str) return '';

  if ( ! format ) {
    format = get_current_format( options );
  }

  return moment.utc(date_str).format(format);
}

// Note: that currently it returns only truely value of given property, that is if there property
// exists and its value is falsy, that undef is returned back
var get_property_from_options = function(options, property_name){
  var value;

  if ( options.hasOwnProperty('data')
    && options.data.hasOwnProperty('root')
    && options.data.root.hasOwnProperty(property_name)
    && options.data.root[property_name]
  ) {
    value = options.data.root[property_name];
  }

  return value;
};

var get_current_format = function(options){

  var format = 'YYYY-MM-DD';

  var user = get_property_from_options(options, 'logged_user')
    || get_property_from_options(options, 'user');

  if ( user && user.hasOwnProperty('company') ) {
    format = user.company.get_default_date_format();
  }

  return format;
}

module.exports = function(){
  return {
    // Handlebars does not allow to have conditions in IF, here is
    // workaround picked from here: http://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
    if_equal :  function(v1, v2, options){
      if(v1 === v2) {
        return options.fn(this);
      }
      return options.inverse(this);
    },

    // Given string with UTC date return string with date formated in customer specific manner
    as_date : function(date_string, options) {

      return as_date_formatted(date_string, undefined, options);
    },

    // Return string with given date formated as a timestamp
    as_datetime : function (date_str, options) {
      return as_date_formatted(
        date_str,
        get_current_format(options) + ' HH:mm:ss',
        options
      );
    },

    // Given string with UTC date and string with moment.js format return corresponding string
    as_date_formatted : as_date_formatted,

    // Get access to config value holding application domain
    get_application_domain : function() {
      return config.get('application_domain');
    },

    // Return URL to the web site with promotion materials for TimeOff.Management
    get_promotion_website_domain : function() {
      return config.get('promotion_website_domain');
    },

    concatenate : function() {
      var arg = Array.prototype.slice.call(arguments,0);
      arg.pop();
      return arg.join('');
    },

  };
};

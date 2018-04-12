
'use strict';

var validator = require('validator'),
    moment    = require('moment'),
    LeaveRequestParameters = require('../../model/leave_request_parameters');

module.exports = function(args){
    var req = args.req,
        params = args.params;

    var user = typeof params.user !== 'undefined' && validator.trim(params.user),
        leave_type = typeof params.leave_type !== 'undefined' && validator.trim(params.leave_type),
        from_date = typeof params.from_date !== 'undefined' && validator.trim(params.from_date),
        from_date_part = typeof params.from_date_part !== 'undefined' && validator.trim(params.from_date_part),
        to_date = typeof params.to_date !== 'undefined' && validator.trim(params.to_date),
        to_date_part = typeof params.to_date_part !== 'undefined' && validator.trim(params.to_date_part),
        reason = typeof params.reason !== 'undefined' && validator.trim(params.reason);

    if (typeof user !== 'undefined' && typeof user !== 'number' && (!user || !validator.isNumeric(user))) {
        req.session.flash_error('Incorrect employee');
    }

    if (typeof leave_type !== 'number' && (!leave_type || !validator.isNumeric(leave_type))) {
        req.session.flash_error('Incorrect leave type');
    }

    var date_validator = function(date_str, label) {
      try {

        // Basic check
        if (! date_str ) throw new Error("date needs to be defined");

        date_str = req.user.company.normalise_date(date_str);

        // Ensure that normalisation went OK
          if (!date_str || !validator.toDate(date_str)) throw new Error("Invalid date format");

      } catch (e) {
        console.log('Got an error ' + e);
        req.session.flash_error(label + ' should be a date');
      }
    }

    date_validator(from_date, 'From date');

    if (typeof from_date_part === 'undefined' ||
        !validator.matches(from_date_part, /^[123]$/) ||
        typeof to_date_part === 'undefined' ||
        !validator.matches(to_date_part, /^[123]$/)
     ){
        req.session.flash_error('Incorrect day part');
    }

    date_validator(to_date, 'To date');

    // Check if it makes sence to continue validation (as following code relies on
    // to and from dates to be valid ones)
    if ( req.session.flash_has_errors() ) {
        const error = new Error('Got validation errors');
        error.flash = req.session.flash;
        throw error;
    }

    // Convert dates inot format used internally
    from_date = req.user.company.normalise_date(from_date);
    to_date = req.user.company.normalise_date(to_date);

    if (from_date.substr(0,4) !== to_date.substr(0,4)) {
        req.session.flash_error('Current implementation does not allow inter year leaves. Please split your request into two parts');
    }

    if ( req.session.flash_has_errors() ) {
        const error = new Error('Got validation errors');
        error.flash = req.session.flash;
        throw error;
    }

    var valid_attributes = {
        leave_type     : leave_type,
        from_date      : from_date,
        from_date_part : from_date_part,
        to_date        : to_date,
        to_date_part   : to_date_part,
        reason         : reason,
    };

    if ( user ) {
        valid_attributes.user = user;
    }

    return new LeaveRequestParameters( valid_attributes );
};


'use strict';

var validator = require('validator'),
    moment    = require('moment'),
    LeaveRequestParameters = require('../../model/leave_request_parameters');

module.exports = function(args){
    var req = args.req;

    var user           = validator.trim( req.param('user') ),
        leave_type     = validator.trim( req.param('leave_type') ),
        from_date      = validator.trim( req.param('from_date') ),
        from_date_part = validator.trim( req.param('from_date_part') ),
        to_date        = validator.trim( req.param('to_date') ),
        to_date_part   = validator.trim( req.param('to_date_part') ),
        reason         = validator.trim( req.param('reason') );

    if (user && !validator.isNumeric(user)){
        req.session.flash_error('Incorrect employee');
    }

    if (!validator.isNumeric(leave_type)){
        req.session.flash_error('Incorrect leave type');
    }

    var date_validator = function(date_str, label) {
      try {

        // Basic check
        if (! date_str ) throw new Error("date needs to be defined");

        date_str = req.user.company.normalise_date(date_str);

        // Ensure that normalisation went OK
        if (! validator.isDate(date_str)) throw new Error("Invalid date format");

      } catch (e) {
        console.log('Got an error ' + e);
        req.session.flash_error(label + ' should be a date');
      }
    }

    date_validator(from_date, 'From date');

    if (  !validator.matches(from_date_part, /^[123]$/)
       || !validator.matches(to_date_part, /^[123]$/)
     ){
        req.session.flash_error('Incorrect day part');
    }

    date_validator(to_date, 'To date');

    if (reason && !validator.matches(reason, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error('Reason should contain letters and numbers only');
        console.warn(
            'User '+req.user.id+' tried to submit bad characters in reason: '+reason
        );
    }

    // Check if it makes sence to continue validation (as following code relies on
    // to and from dates to be valid ones)
    if ( req.session.flash_has_errors() ) {
      throw new Error( 'Got validation errors' );
    }

    // Convert dates inot format used internally
    from_date = req.user.company.normalise_date(from_date);
    to_date = req.user.company.normalise_date(to_date);

    if (from_date.substr(0,4) !== to_date.substr(0,4)) {
        req.session.flash_error('Current implementation does not allow inter year leaves. Please split your request into two parts');
    }

    if ( req.session.flash_has_errors() ) {
      throw new Error( 'Got validation errors' );
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

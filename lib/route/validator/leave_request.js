
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

    if (!validator.isDate(from_date)){
        req.session.flash_error('From date should be a date');
    }

    if (  !validator.matches(from_date_part, /^[123]$/)
       || !validator.matches(to_date_part, /^[123]$/)
     ){
        req.session.flash_error('Incorrect day part');
    }

    if (!validator.isDate(to_date)){
        req.session.flash_error('To date should be date');
    }

    if (reason && !validator.matches(reason, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error('Reason should contain letters and numbers only');
        console.warn(
            'User '+req.user.id+' tried to submit bad characters in reason: '+reason
        );
    }

    if (from_date.substr(0,4) !== to_date.substr(0,4)) {
        req.session.flash_error('Current implementation does not allow inter year leaves. Please split your request into two parts');
    }

    if ( req.session.flash_has_errors() ) {
        throw new Error( 'Got validation errors' );
    }

    // Conver date into forma used by DB
    if ( ! req.user.company ) {
      throw new Error("Session's user object does not have company fetched from DB");
    } else {
      from_date = moment(from_date, req.user.company.get_default_date_format()).format('YYYY-MM-DD');
      to_date = moment(to_date, req.user.company.get_default_date_format()).format('YYYY-MM-DD');
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

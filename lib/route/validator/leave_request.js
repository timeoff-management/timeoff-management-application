
'use strict';

var validator = require('validator'),
    moment    = require('moment');

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

    if (  !validator.matches(from_date_part, /^[12]$/)
       || !validator.matches(to_date_part, /^[12]$/)
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

    if ( req.session.flash_has_errors() ) {
        throw new Error( 'Got validation errors' );
    }

    // From date should not be bigger then to
    if (moment(from_date).toDate() > moment(to_date).toDate()){
        throw new Error( 'From date should be before To date' );
    }

    return {
        user           : user,
        leave_type     : leave_type,
        from_date      : from_date,
        from_date_part : from_date_part,
        to_date        : to_date,
        to_date_part   : to_date_part,
        reason         : reason,
    };
};

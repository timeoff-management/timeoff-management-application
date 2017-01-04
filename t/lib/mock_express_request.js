/*
 * Class whose instances are mocked ExpressJS request objects.
 *
 * */
'use strict';

module.exports = function(args){

    var params = args.params || {},
        error_messages = [];

    var req = {
        session : {},
        user    : {
          company : { get_default_date_format : function() {'YYYY-MM-DD'} },
        },
        param   : function(key){
            return params[key];
        },
    };

    // Make request be aware of flash messages
    require('../../lib/middleware/flash_messages')(req,{locals:{}},function(){});

    return req;
};

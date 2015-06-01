
"use strict";

var express   = require('express'),
    router    = express.Router(),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    validator = require('validator'),
    _         = require('underscore');

router.get('/', function(req, res){

    Promise.join(
        req.user.promise_my_leaves(),
        req.user.promise_leaves_to_be_processed(),
        function(my_leaves, to_be_approved_leaves){

            res.render('requests',{
                my_leaves             : my_leaves,
                to_be_approved_leaves : to_be_approved_leaves,
            });
        }
    );
});

router.post('/reject/', function(req, res){

  var request_id = validator.trim( req.param('request') );

  if (!validator.isNumeric(request_id)){
    req.session.flash_error('Failed to reject');
  }

  if ( req.session.flash_has_errors() ) {
    console.error('Got validation errors on reject request handler');

    res.redirect_with_session('../');
  }

  Promise.try(function(){
    return req.user.promise_leaves_to_be_processed();
  })
  .then(function(leaves){
     var leave_to_reject = _.find(leaves, function(leave){
        return String(leave.id) === String(request_id)
          && leave.is_pended_leave();
     });

     if (! leave_to_reject) {
       throw new Error('Provided ID '+request_id
         +'does not correspond to any Pended leave requests for user ' +
         req.user.id
        );
     }

     return leave_to_reject.promise_to_reject();
  })
  .then(function(rejected_leave){
    req.session.flash_message('Request from '+rejected_leave.user.full_name()
        +' was rejected');

    res.redirect_with_session('../');
  })
  .catch(function(error){
    console.error('An error occurred when attempting to reject leave request '
      + request_id + ' by user ' + req.user.id + ' Error: ' + error
    );
    req.session.flash_error('Failed to reject');
    res.redirect_with_session('../');
  });

});


module.exports = router;

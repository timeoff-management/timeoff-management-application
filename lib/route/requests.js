
"use strict";

var express   = require('express'),
    router    = express.Router(),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
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


module.exports = router;

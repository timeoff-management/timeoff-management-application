
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    _         = require('underscore');

router.get('/', function(req, res) {

    Promise.join(
        Promise.resolve(function(){ return req.user.reload(); }),
        Promise.resolve(function(){ return req.user.getCompany(); }),
        function(employee, company){
            res.render('calendar', {
                company : company,
                employee : req.user
            });       
    });


});


module.exports = router;

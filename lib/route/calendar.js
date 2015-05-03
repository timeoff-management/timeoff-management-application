
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    CalendarMonth = require('../model/calendar_month');

router.get('/', function(req, res) {

    Promise.join(
        Promise.resolve(function(){ return req.user.reload(); }),
        Promise.resolve(function(){ return req.user.getCompany(); }),
        function(employee, company){
            res.render('calendar', {
                company : company,
                employee : req.user,
                calendar :
                    _.map([1,2,3,4,5,6,7,8,9,10,11,12],function(i){
                        return(new CalendarMonth('2015-'+i+'-01')).as_for_template();
                    }),
            });       
    });


});


module.exports = router;

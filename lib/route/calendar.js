
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    CalendarMonth = require('../model/calendar_month');

router.post('/bookleave/', function(){

});

router.get('/', function(req, res) {

    res.locals.custom_java_script.push(
        '/js/bootstrap-datepicker.js'
    );
    res.locals.custom_css.push(
        '/css/bootstrap-datepicker3.standalone.css'
    );

    req.user.promise_calendar()
        .then(function(calendar){
            res.render('calendar', {
                employee : req.user,
                calendar : calendar,
            });
        });
});


module.exports = router;


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

    Promise.try(function(){
        // TODO validate parameters
    })

    .then(function(){
        // TODO
        // check that current user can book a holiday for the user submitted in
        // a form
    })

    .catch(function(error){
        console.error(
            'An error occured when user '+req.user.id+
            ' try to create a leave request: '+error
        );
        req.session.flash_error('Failed to create a leave request');
        res.redirect_with_session('../');
    });

});

router.get('/', function(req, res) {

    res.locals.custom_java_script.push(
        '/js/bootstrap-datepicker.js'
    );
    res.locals.custom_css.push(
        '/css/bootstrap-datepicker3.standalone.css'
    );

    Promise.join(
        req.user.promise_calendar(),
        req.user.get_company_with_all_leave_types(),
        req.user.promise_users_I_can_manage(),
        function(calendar, company, employees){
            res.render('calendar', {
                calendar      : calendar,
                company       : company,
                employees     : employees,
                booking_start : moment(),
                booking_end   : moment(),
            });
        }
    );

});


module.exports = router;

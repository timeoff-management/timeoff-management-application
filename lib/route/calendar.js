
"use strict";

var express   = require('express'),
    router    = express.Router(),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    get_and_validate_leave_params = require('./validator/leave_request'),
    CalendarMonth                 = require('../model/calendar_month');

router.post('/bookleave/', function(req, res){

    Promise.try(function(){
        return get_and_validate_leave_params({req : req});
    })

    .then(function(valide_attibutes){
        // TODO
        // check that current user can book a holiday for the user submitted in
        // a form
        //
        // Add the leave request into the system
        //
        req.session.flash_message('New leave request was added');
        res.redirect_with_session('../');
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


"use strict";

var express   = require('express'),
    router    = express.Router(),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    validator = require('validator'),
    get_and_validate_leave_params = require('./validator/leave_request'),
    CalendarMonth                 = require('../model/calendar_month');

router.post('/bookleave/', function(req, res){

    Promise.join (
        req.user.promise_users_I_can_manage(),
        req.user.get_company_with_all_leave_types(),
        Promise.try( function(){return get_and_validate_leave_params({req : req})}),
        function(users, company, valide_attributes){
            // Make sure that indexes submitted map to existing objects
            var employee = users[valide_attributes.user] || req.user,
                leave_type = company.leave_types[valide_attributes.leave_type];

            if (!employee) {
                req.session.flash_error('Incorrect employee');
                throw new Error( 'Got validation errors' );
            }

            if (!leave_type) {
                req.session.flash_error('Incorrect leave type');
                throw new Error( 'Got validation errors' );
            }

            return model.Leave.create_new_leave({
                for_employee    : employee,
                of_type         : leave_type,
                with_parameters : valide_attributes,
            });
        }
    )

    .then(function(leave){

        req.session.flash_message('New leave request was added');
        res.redirect_with_session('../');
    })

    .catch(function(error){
        console.error(
            'An error occured when user '+req.user.id+
            ' try to create a leave request: '+error
        );
        req.session.flash_error('Failed to create a leave request');
        if (error.hasOwnProperty('user_message')) {
            req.session.flash_error(error.user_message);
        }
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

    var current_year = validator.isNumeric(req.param('year'))
        ? moment(req.param('year'), 'YYYY')
        : moment();

    Promise.join(
        req.user.promise_calendar({ year : current_year }),
        req.user.get_company_with_all_leave_types(),
        req.user.promise_users_I_can_manage(),
        req.user.reload_with_leave_details({ year : current_year }),
        function(calendar, company, employees, user){
            res.render('calendar', {
                calendar      : calendar,
                company       : company,
                employees     : employees,
                booking_start : moment(),
                booking_end   : moment(),
                title         : 'My calendar',
                current_user  : user,
                previous_year : moment(current_year).add(-1,'year').format('YYYY'),
                current_year  : current_year.format('YYYY'),
                next_year     : moment(current_year).add(1,'year').format('YYYY'),
            });
        }
    );

});

module.exports = router;

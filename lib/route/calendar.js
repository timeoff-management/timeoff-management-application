
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
        res.redirect_with_session(
          req.param('redirect_back_to')
            ? req.param('redirect_back_to')
            : '../'
        );
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
        res.redirect_with_session(
          req.param('redirect_back_to')
            ? req.param('redirect_back_to')
            : '../'
        );
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
                calendar      : _.map(calendar, function(c){return c.as_for_template()}),
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

router.get('/wallchart/', function(req, res){

  res.locals.custom_java_script.push(
      '/js/bootstrap-datepicker.js'
  );
  res.locals.custom_css.push(
      '/css/bootstrap-datepicker3.standalone.css'
  );

  var base_date = validator.isDate(req.param('date'))
    ? moment(req.param('date'), 'YYYY-MM-DD')
    : moment();

  var related_departments = [],
    current_deparment_id  = validator.isNumeric(req.param('department'))
      ? req.param('department')
      : null,
    current_department;

  // Promise departments either supervised by current user or one that she belongs to
  var promise_departments = Promise.join(
    req.user.getDepartment(),
    req.user.getSupervised_departments(),
    function(my_department, supervised_departments){

      // Get all related departments by combining supervised ones with
      // one current user belongs to
      supervised_departments.push(my_department);
      supervised_departments = _.uniq(supervised_departments, function(item){ return item.id });

      // Copy all available departments for current user into closured variable
      // to pass it into template
      related_departments = _.sortBy(supervised_departments, 'name');

      // Find out what particular department is active now
      if (current_deparment_id) {
        current_department = _.findWhere(supervised_departments, { id : Number(current_deparment_id) });
      }

      return Promise.resolve(current_department ? [current_department] : supervised_departments);
    }
  );

  // Calculate users and leaves for every department
  var promise_users_and_leaves = promise_departments.map(function(department){
    return department.promise_wall_chart({ base_date : base_date });
  });

  Promise.join(
    promise_users_and_leaves,
    req.user.get_company_with_all_leave_types(),
    req.user.promise_users_I_can_manage(),
    function(array_of_arrays, company, employees){
      var users_and_leaves = _.flatten(array_of_arrays);

      return res.render('wall_chart', {
        base_date           : base_date,
        prev_date           : moment(base_date).add(-1,'month'),
        next_date           : moment(base_date).add(1,'month'),
        users_and_leaves    : users_and_leaves,
        related_departments : related_departments,
        current_department  : current_department,
        company             : company,
        employees           : employees,
      });

    });

});

module.exports = router;

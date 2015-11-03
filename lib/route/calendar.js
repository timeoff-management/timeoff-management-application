
"use strict";

var express   = require('express'),
    router    = express.Router(),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    validator = require('validator'),
    get_and_validate_leave_params = require('./validator/leave_request'),
    Wallchart                     = require('../model/team_view'),
    CalendarMonth                 = require('../model/calendar_month'),
    EmailTransport                = require('../email');

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
      return leave.reload({
        include : [
          {model : model.User, as : 'user'},
          {model : model.User, as : 'approver'},
          {model : model.LeaveDay, as : 'days'},
          {model : model.LeaveType, as : 'leave_type'},
        ],
      });
    })
    .then(function(leave){
      var Email = new EmailTransport();

      return Email.promise_leave_request_emails({
        leave : leave,
      });

    })
    .then(function(){

        req.session.flash_message('New leave request was added');
        return res.redirect_with_session(
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
        return res.redirect_with_session(
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

  var wallchart = new Wallchart({
    base_date : base_date,
    user      : req.user,
  });

  var current_deparment_id  = validator.isNumeric(req.param('department'))
    ? req.param('department')
    : null;

  Promise.join(
    wallchart.promise_wallchart_details({
      department_id : current_deparment_id,
    }),
    req.user.get_company_with_all_leave_types(),
    req.user.promise_users_I_can_manage(),
    function(wallchart_details, company, employees){

      return res.render('team_view', {
        base_date           : base_date,
        prev_date           : moment(base_date).add(-1,'month'),
        next_date           : moment(base_date).add(1,'month'),
        users_and_leaves    : wallchart_details.users_and_leaves,
        related_departments : wallchart_details.related_departments,
        current_department  : wallchart_details.current_department,
        company             : company,
        employees           : employees,
      });

    });

});

router.get('/feeds/', function(req, res){
  req.user
    .getFeeds()
    .then(function(feeds){

      return Promise.join(
        promise_feed_of_type({user : req.user, feeds: feeds, type : 'calendar'}),
        promise_feed_of_type({user : req.user, feeds: feeds, type : 'wallchart'}),
        promise_feed_of_type({user : req.user, feeds: feeds, type : 'company'}),
        function(calendar_feed, wallchart_feed, company_feed){
          res.render('feeds_list', {
            title         : 'My feeds',
            calendar_feed : calendar_feed,
            wallchart_feed: wallchart_feed,
            current_host  : req.get('host'),
          });
      });

    });
});

router.post('/feeds/regenerate/', function(req, res){
  req.user
    .getFeeds()
    .then(function(feeds){
      var the_feed = _.findWhere(feeds, { feed_token : req.param('token') });

      if (the_feed) {

        return model.UserFeed.promise_new_feed({
          user : req.user,
          type : the_feed.type,
        });
      }

      return Promise.resolve();
    })
    .then(function(){
        req.session.flash_message('Feed was regenerated');
        return res.redirect_with_session('/calendar/feeds/');
    });
});

// Fetch or create new feed feed provided types
function promise_feed_of_type(args) {
  var type = args.type,
      user = args.user,
      feeds= args.feeds,
      feed = _.findWhere(feeds, { type : type }),
      feed_promise;

  if (! feed) {
    feed_promise = model.UserFeed.promise_new_feed({
      user : user,
      type : type,
    });
  } else {
    feed_promise = Promise.resolve( feed );
  }

  return feed_promise;
};

module.exports = router;

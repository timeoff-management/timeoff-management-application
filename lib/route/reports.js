
"use strict";

const
  express   = require('express'),
  router    = express.Router(),
  validator = require('validator'),
  Promise   = require('bluebird'),
  moment    = require('moment'),
  config    = require('../config'),
  TeamView  = require('../model/team_view'),
  Exception = require('../error'),
  csv       = Promise.promisifyAll(require('csv')),
  _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/', (req, res) => {
  res.render('report/index');
});

router.get('/allowancebytime/', (req, res) => {

  let start_date = validator.isDate(req.query['start_date'])
    ? moment.utc(req.query['start_date'])
    : req.user.company.get_today();

  let end_date = validator.isDate(req.query['end_date'])
    ? moment.utc(req.query['end_date'])
    : req.user.company.get_today();

  var team_view = new TeamView({
    user      : req.user,
    start_date : start_date,
    end_date   : end_date,
  });

  var current_deparment_id  = validator.isNumeric(req.query['department'])
    ? req.query['department']
    : null;

  Promise.join(
    team_view.promise_team_view_details({
      department_id : current_deparment_id,
    }),
    req.user.get_company_with_all_leave_types(),
    (team_view_details, company) => {
      return team_view
        .inject_statistics({
          team_view_details : team_view_details,
          leave_types       : company.leave_types,
        })
        .then(team_view_details => render_allowancebytime({
          req               : req,
          res               : res,
          team_view_details : team_view_details,
          company           : company,
          start_date        : start_date,
          end_date          : end_date,
        }))
    })
    .catch(error => {
      console.error(
        'An error occured when user '+req.user.id+
        ' tried to access /reports/allowancebytime page: '+error
      );

      let
        user_error_message = 'Failed to produce report. Please contact administrator.',

        // By default go back to root report page
        redirect_path = '../';

      if ( error.tom_error ) {
        user_error_message = Exception.extract_user_error_message(error);

        // If it is known error: stay on current page
        redirect_path = './';
      }

      req.session.flash_error(user_error_message);

      return res.redirect_with_session(redirect_path);
    });
});

function render_allowancebytime(args) {
  let
    req               = args.req,
    res               = args.res,
    team_view_details = args.team_view_details,
    company           = args.company,
    start_date        = args.start_date,
    end_date          = args.end_date;

    return Promise
      .try(() => req.query['as-csv']
        ? render_allowancebytime_as_csv(args)
        : res.render('report/allowancebytime', {
          users_and_leaves    : team_view_details.users_and_leaves,
          related_departments : team_view_details.related_departments,
          current_department  : team_view_details.current_department,
          company             : company,
          start_date_str      : start_date.format('YYYY-MM'),
          end_date_str        : end_date.format('YYYY-MM'),
          start_date_obj      : start_date,
          end_date_obj        : end_date,
          same_month          : (start_date.format('YYYYMM') === end_date.format('YYYYMM')),
        })
      );
}

function render_allowancebytime_as_csv(args) {
  let
    req               = args.req,
    res               = args.res,
    team_view_details = args.team_view_details,
    company           = args.company,
    start_date        = args.start_date,
    end_date          = args.end_date;

  // Compose file name
  res.attachment(
    company.name_for_machine()
      + '_employee_allowances_between'
      + start_date.format('YYYY_MM')
      + '_and_'
      + end_date.format('YYYY_MM')
      + '.csv'
  );

  // Compose result CSV header
  let content = [
    ['email', 'last name', 'name']
    // Add dynamic list of Leave Types
    .concat(
      team_view_details.users_and_leaves.length > 0
        ? team_view_details.users_and_leaves[0].statistics.leave_type_break_down.pretty_version.map(it => it.name)
        : []
    )
    .concat(['days deducted from allowance'])
  ];

  // ... and body
  team_view_details.users_and_leaves.forEach(ul => {
    content.push(
      [
        ul.user.email,
        ul.user.lastname,
        ul.user.name,
      ]
      // Dynamic part of the column list
      .concat( ul.statistics.leave_type_break_down.pretty_version.map(it => it.stat))
      .concat([ul.statistics.deducted_days])
    );
  });

  return csv.stringifyAsync( content )
    .then(csv_data_string => res.send(csv_data_string));
}

module.exports = router;

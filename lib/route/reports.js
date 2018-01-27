
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
  _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/', (req, res) => {
  res.render('report/index');
});

router.get('/allowancebytime/', (req, res) => {

  let start_date = validator.isDate(req.param('start_date'))
    ? moment.utc(req.param('start_date'))
    : req.user.company.get_today();

  let end_date = validator.isDate(req.param('end_date'))
    ? moment.utc(req.param('end_date'))
    : req.user.company.get_today();

  var team_view = new TeamView({
    user      : req.user,
    start_date : start_date,
    end_date   : end_date,
  });

  var current_deparment_id  = validator.isNumeric(req.param('department'))
    ? req.param('department')
    : null;

  Promise.join(
    team_view.promise_team_view_details({
      department_id : current_deparment_id,
    }),
    req.user.get_company_with_all_leave_types(),
    (team_view_details, company) => {
      team_view
        .inject_statistics({
          team_view_details : team_view_details,
          leave_types       : company.leave_types,
        })
        .then(team_view_details => res.render('report/allowancebytime', {
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
    })
    .catch(error => {
      console.error(
        'An error occured when user '+req.user.id+
        ' tried to access Teamview page: '+error
      );

      let user_error_message = 'Failed to produce report. Please contact administrator.';

      if ( error.tom_error ) {
        user_error_message = Exception.extract_user_error_message(error);
      }

      req.session.flash_error(user_error_message);

      return res.redirect_with_session('./');
    });
});

module.exports = router;

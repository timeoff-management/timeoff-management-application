
"use strict";

const
  express   = require('express'),
  router    = express.Router(),
  validator = require('validator'),
  Promise   = require('bluebird'),
  moment    = require('moment'),
  config    = require('../config'),
  TeamView  = require('../model/team_view'),
  _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/', (req, res) => {
  res.render('report/index');
});

router.get('/allowancebytime/', (req, res) => {

  var base_date = validator.isDate(req.param('date'))
    ? moment.utc(req.param('date'))
    : req.user.company.get_today();

  var team_view = new TeamView({
//    base_date : base_date,
    user      : req.user,
    start_date : base_date.clone().add(-5, 'months'),
    end_date   : base_date.clone().add(-1, 'months'),
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
          })
        );
    })
    .catch(error => {
      console.error(
        'An error occured when user '+req.user.id+
        ' tried to access Teamview page: '+error
      );
      req.session.flash_error('Failed to access Teamview page. Please contact administrator.');
      if (error.hasOwnProperty('user_message')) {
        req.session.flash_error(error.user_message);
      }
      return res.redirect_with_session('/');
    });

  // res.render('report/allowancebytime');
});

module.exports = router;

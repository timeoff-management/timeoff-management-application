'use strict'

const express = require('express')
const router = express.Router()
const Promise = require('bluebird')
const moment = require('moment')
const _ = require('underscore')
const validator = require('validator')
const get_and_validate_leave_params = require('./validator/leave_request')
const TeamView = require('../model/team_view')
const EmailTransport = require('../email')
const SlackTransport = require('../slack')

const {
  createNewLeave,
  getLeaveForUserView,
  doesUserHasExtendedViewOfLeave
} = require('../model/leave')
const { leaveIntoObject } = require('../model/Report')
const { getCommentsForLeave } = require('../model/comment')
const { sorter } = require('../util')

router.post('/bookleave/', (req, res) => {
  Promise.join(
    req.user.promise_users_I_can_manage(),
    req.user.get_company_with_all_leave_types(),
    Promise.try(() => get_and_validate_leave_params({ req, params: req.body })),
    (users, company, valide_attributes) => {
      // Make sure that indexes submitted map to existing objects
      const employee = users[valid_attributes.user] || req.user
      const [leave_type] = company.leave_types.filter(
        lt => `${lt.id}` === `${valid_attributes.leave_type}`
      )

      if (!employee) {
        req.session.flash_error('Incorrect employee')
        throw new Error('Got validation errors')
      }

      if (!leave_type) {
        req.session.flash_error('Incorrect leave type')
        throw new Error('Got validation errors')
      }

      if (company.is_mode_readonly_holidays()) {
        req.session.flash_error(
          'Company account is locked and new Timeoff ' +
            'requests could not be added. Please contact administration.'
        )
        throw new Error('Company is in "Read-only holidays" mode')
      }

      return createNewLeave({
        for_employee: employee,
        of_type: leave_type,
        with_parameters: valid_attributes
      })
    }
  )
    .then(leave => leave.reloadWithAssociates())
    /*
    .then(function(leave){
      return leave.reload({
        include : [
          {model : model.User, as : 'user'},
          {model : model.User, as : 'approver'},
          {model : model.LeaveType, as : 'leave_type'},
        ],
      });
    })
    */
    .then((leave) => {
      const Slack = new SlackTransport()

      Slack.promise_leave_request_slacks({
        leave
      })

      const Email = new EmailTransport()

      return Email.promise_leave_request_emails({
        leave
      })
    })
    .then(() => {
      req.session.flash_message('New leave request was added')
      return res.redirect_with_session(
        req.body.redirect_back_to ? req.body.redirect_back_to : '../'
      )
    })

    .catch((error) => {
      console.error(
        'An error occured when user ' +
          req.user.id +
          ' try to create a leave request: ',
        error,
        error.stack
      )
      req.session.flash_error('Failed to create a leave request')
      if (error.hasOwnProperty('user_message')) {
        req.session.flash_error(error.user_message)
      }
      return res.redirect_with_session(
        req.body.redirect_back_to ? req.body.redirect_back_to : '../'
      )
    })
})

router.get('/', (req, res) => {
  const current_year =
    req.query.year && validator.isNumeric(req.query.year)
      ? moment.utc(req.query.year, 'YYYY')
      : req.user.company.get_today()

  const show_full_year =
    (req.query.show_full_year &&
      validator.toBoolean(req.query.show_full_year)) ||
    false

  Promise.join(
    req.user.promise_calendar({
      year: current_year.clone(),
      show_full_year
    }),
    req.user.get_company_with_all_leave_types(),
    req.user.reload_with_leave_details({ year: current_year }),
    req.user.promise_supervisors(),
    req.user.promise_allowance({ year: current_year }),
    (calendar, company, user, supervisors, user_allowance) => {
      const full_leave_type_statistics = user.get_leave_statistics_by_types()

      res.render('calendar', {
        calendar: _.map(calendar, (c) => c.as_for_template()),
        company,
        title: 'Calendar | TimeOff',
        current_user: user,
        supervisors,
        previous_year: moment
          .utc(current_year)
          .add(-1, 'year')
          .format('YYYY'),
        current_year: current_year.format('YYYY'),
        next_year: moment
          .utc(current_year)
          .add(1, 'year')
          .format('YYYY'),
        show_full_year,
        leave_type_statistics: _.filter(
          full_leave_type_statistics,
          st => st.days_taken > 0
        ),

        // User allowance object is simple object with attributes only
        user_allowance
      })
    }
  )
})

router.get('/teamview/', async (req, res) => {
  const user = req.user

  if (user.company.is_team_view_hidden && !user.admin) {
    return res.redirect_with_session('/')
  }

  const base_date =
    req.query.date && validator.toDate(req.query.date)
      ? moment.utc(req.query.date)
      : req.user.company.get_today()

  const grouped_mode = getGroupedModeParameter(req)
  const current_deparment_id = getDepartmentIdForTeamView(req)
  const team_view = new TeamView({ user, base_date })

  Promise.join(
    team_view.promise_team_view_details({
      department_id: current_deparment_id
    }),
    user.get_company_with_all_leave_types(),
    (team_view_details, company) => {
      // Enrich "team view details" with statistics as how many deducted days each employee spent current month
      team_view
        .inject_statistics({
          team_view_details,
          leave_types: company.leave_types
        })
        .then(team_view_details =>
          team_view.restrainStatisticsForUser({
            team_view_details,
            user: req.user
          })
        )
        .then(team_view_details =>
          res.render('team_view', {
            base_date,
            prev_date: moment.utc(base_date).add(-1, 'month'),
            next_date: moment.utc(base_date).add(1, 'month'),
            users_and_leaves: team_view_details.users_and_leaves,
            related_departments: team_view_details.related_departments,
            current_department: team_view_details.current_department,
            company,
            title: 'Team View | TimeOff',
            grouped_mode: grouped_mode !== null,
            users_and_leaves_by_departments:
              grouped_mode !== null
                ? groupUsersOnTeamViewByDepartments(
                  team_view_details.users_and_leaves
                )
                : null
          })
        )
    }
  ).catch(error => {
    console.error(
      'An error occured when user ' +
        req.user.id +
        ' tried to access Teamview page: ',
      error,
      error.stack
    )
    req.session.flash_error(
      'Failed to access Teamview page. Please contact administrator.'
    )
    if (error.hasOwnProperty('user_message')) {
      req.session.flash_error(error.user_message)
    }
    return res.redirect_with_session('/')
  })
})

const getGroupedModeParameter = req => {
  /**
   * grouped_mode parameter is saved in the current session so user's
   * transition between different pages does not reset the value
   */
  let groupedMode = !!req.query.grouped_mode

  if (req.query.save_grouped_mode) {
    req.session.teamViewGroupedMode = groupedMode
  }

  // for cases when no grouped_mode parameter was supplied: used onf from session
  if (req.query.grouped_mode === undefined) {
    groupedMode = req.session.teamViewGroupedMode
  }

  return groupedMode
}

const getDepartmentIdForTeamView = req => {
  /**
   * department parameter is saved in the current session so user's
   * transition between different pages does not reset the value
   */

  let departmentId =
    req.query.department && validator.isNumeric(req.query.department)
      ? req.query.department
      : null

  if (req.query.save_current_department) {
    req.session.teamViewDepartmentId = departmentId
  }

  // for cases when no grouped_mode parameter was supplied: used onf from session
  if (req.query.department === undefined) {
    departmentId = req.session.teamViewDepartmentId
  }

  return departmentId
}

const groupUsersOnTeamViewByDepartments = usersAndLeaves => {
  const departmentsDict = usersAndLeaves.reduce(
    (acc, item) => ({
      ...acc,
      [item.user.department.id]: {
        departmentName: item.user.department.name,
        users_and_leaves: []
      }
    }),
    {}
  )

  usersAndLeaves.forEach(item => {
    departmentsDict[item.user.department.id].users_and_leaves.push(item)
  })

  return Object.values(departmentsDict).sort((a, b) =>
    sorter(a.departmentName, b.departmentName)
  )
}

router.get('/feeds/', (req, res) => {
  req.user.getFeeds().then((feeds) => Promise.join(
    promise_feed_of_type({ user: req.user, feeds, type: 'calendar' }),
    promise_feed_of_type({ user: req.user, feeds, type: 'teamview' }),
    (calendar_feed, team_view_feed) => {
      res.render('feeds_list', {
        title: 'My feeds | TimeOff',
        calendar_feed,
        team_view_feed,
        current_host: req.get('host')
      })
    }
  ))
})

router.post('/feeds/regenerate/', (req, res) => {
  const model = req.app.get('db_model')

  req.user
    .getFeeds()
    .then((feeds) => {
      const the_feed = _.findWhere(feeds, { feed_token: req.body.token })

      if (the_feed) {
        return model.UserFeed.promise_new_feed({
          user: req.user,
          type: the_feed.type
        })
      }

      return Promise.resolve()
    })
    .then(() => {
      req.session.flash_message('Feed was regenerated')
      return res.redirect_with_session('/calendar/feeds/')
    })
})

// Fetch or create new feed feed provided types
function promise_feed_of_type(args) {
  const type = args.type
  const user = args.user
  const feeds = args.feeds
  const feed = _.findWhere(feeds, { type })
  let feed_promise

  if (!feed) {
    feed_promise = user.sequelize.models.UserFeed.promise_new_feed({
      user,
      type
    })
  } else {
    feed_promise = Promise.resolve(feed)
  }

  return feed_promise
}

router.get('/leave-summary/:leaveId/', async (req, res) => {
  const actingUser = req.user
  const leaveId = validator.trim(req.params.leaveId)
  const dbModel = req.app.get('db_model')

  try {
    const leave = await getLeaveForUserView({ actingUser, leaveId, dbModel })
    const extendedView = await doesUserHasExtendedViewOfLeave({
      user: actingUser,
      leave
    })
    if (extendedView) {
      const user = await leave.getUser()
      await user.promise_schedule_I_obey()
      const [extendedLeave] = await user.promise_my_leaves({
        ignore_year: true,
        filter: { id: leave.id }
      })
      const leaveDetails = leaveIntoObject(extendedLeave)
      const comments = await getCommentsForLeave({ leave })

      leaveDetails.commentsString = comments
        .map(({ comment }) => comment)
        .join('<br>')

      return res.render('leave/popup_leave_details', {
        leave: leaveDetails,
        layout: false
      })
    } else {
      // return res.send('Short');
      const leaveDetails = leaveIntoObject(leave)
      return res.render('leave/popup_leave_details', {
        leave: leaveDetails,
        layout: false,
        limitedView: true
      })
    }
  } catch (error) {
    console.log(
      `Failed to obtain Leave [${leaveId}] summary: ${error} at ${error.stack}`
    )
    return res.send('Failed to get leave details...')
  }

  return res.send('Failed to get leave details (should never happen)...')
})

module.exports = router

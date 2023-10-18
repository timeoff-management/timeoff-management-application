'use strict'

const express = require('express')
const router = express.Router()
const validator = require('validator')
const Promise = require('bluebird')
const moment = require('moment')
const csv = Promise.promisifyAll(require('csv'))
const fs = require('fs')
const formidable = require('formidable')
const LeaveCollectionUtil = require('../../model/leave_collection')()
const Exception = require('../../error')
const UserImporter = require('../../model/user_importer')
const EmailTransport = require('../../email')
const { getAuditCaptureForUser } = require('../../model/audit')
const SlackTransport = require('../../slack')
const multer = require('multer')
const upload = multer()
const Sequelize = require('sequelize')
const Op = Sequelize.Op

const { sorter } = require('../../util')
// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../../middleware/ensure_user_is_admin'))

router.get('/add/', (req, res) => {
  req.user.get_company_for_add_user().then(company => {
    res.render('user_add', {
      company,
      departments: company.departments.sort((a, b) => sorter(a.name, b.name)),
      title: 'Add new user | TimeOff'
    })
  })
})

router.post('/add/', (req, res) => {
  const Email = new EmailTransport()
  const Slack = new SlackTransport()

  let current_company, new_user_attributes

  req.user
    .get_company_for_add_user()
    .then(company => {
      current_company = company

      new_user_attributes = get_and_validate_user_parameters({
        req,
        params: req.body,
        item_name: 'user',
        departments: company.departments,
        // If current company has LDAP auth do not require password
        require_password: !company.ldap_auth_enabled
      })

      return Promise.resolve()
    })

    // Make sure that we do not add user with existing emails
    .then(() =>
      UserImporter.validate_email_to_be_free({
        email: new_user_attributes.email
      })
    )

    // Add new user to database
    .then(() =>
      UserImporter.add_user({
        name: new_user_attributes.name,
        slack_username: new_user_attributes.slack_username,
        lastname: new_user_attributes.lastname,
        email: new_user_attributes.email,
        department_id: new_user_attributes.department_id,
        start_date: new_user_attributes.start_date,
        end_date: new_user_attributes.end_date,
        admin: new_user_attributes.admin,
        auto_approve: new_user_attributes.auto_approve,
        company_id: req.user.company_id,
        password: new_user_attributes.password
      })
    )

    .then(new_user =>
      Email.promise_add_new_user_email({
        company: current_company,
        admin_user: req.user,
        new_user
      })
    )

    .then(new_user =>
      Slack.promise_add_new_user_slack({
        company: current_company,
        admin_user: req.user,
        new_user
      })
    )

    .then(() => {
      if (req.session.flash_has_errors()) {
        return res.redirect_with_session('../add/')
      } else {
        req.session.flash_message('New user account successfully added')
        return res.redirect_with_session('../')
      }
    })

    .catch(error => {
      console.log(
        'An error occurred when trying to add new user account by user ' +
          req.user.id,
        error.stack
      )
      console.dir(error)

      if (error && error.tom_error) {
        req.session.flash_error(Exception.extract_user_error_message(error))
      }

      req.session.flash_error('Failed to add new user')

      return res.redirect_with_session('../add/')
    })
})

router.get('/import/', (req, res) => {
  req.user.getCompany().then(company =>
    res.render('users_import', {
      company,
      title: 'Import users | TimeOff'
    })
  )
})

router.post('/import/', upload.single('users_import'), (req, res) => {
  const form = new formidable.IncomingForm()
  const parseAsync = Promise.promisify(form.parse)

  parseAsync
    .call(form, req)
    .then(args => {
      if (req.file.size === 0) {
        Exception.throw_user_error({
          user_error: 'No .CSV file to restore from was provided',
          system_error:
            'User ' +
            req.user.id +
            ' tried to import employees ' +
            'without submitting .CSV file'
        })
      } else if (req.file.size > 2097152) {
        Exception.throw_user_error({
          user_error: '.CSV file could not be bigger then 2M',
          system_error:
            'User ' + req.user.id + ' tried to submit file bigger then ' + '2M'
        })
      }

      if (req.file.path && !req.file.buffer) {
        // disk storage
        return fs.readFileAsync(req.file.path, 'utf8')
      }

      // memory storage
      return req.file.buffer.toString()
    })
    .then(csv_data_string => csv.parseAsync(csv_data_string, { trim: true }))
    .then(parsed_data => {
      // Limit number of employees to be imported at one go
      //
      if (parsed_data.length > 201) {
        Exception.throw_user_error({
          user_error:
            'Cannot import more then 200 employees per one go. ' +
            'Please splite .CSV file into chunks of no more then 200 employees ' +
            'and process them each at the time',
          system_error:
            'User ' +
            req.user.id +
            ' tried to import more then 200 ' +
            'user at one time'
        })
      }

      return UserImporter.add_users_in_bulk({
        to_company_id: req.user.company_id,
        bulk_header: parsed_data.shift(),
        bulk_data: parsed_data
      })
    })
    .then(action_result => {
      console.dir(action_result)
      if (action_result.users.length > 0) {
        req.session.flash_message(
          'Successfully imported users with following emails: ' +
            action_result.users
              .map(user => user.email)
              .sort()
              .join(', ')
        )
      }
      if (action_result.errors.length > 0) {
        action_result.errors.forEach(err =>
          req.session.flash_error(
            'Failed to add user ' + err.email + '. Reason: ' + err.error
          )
        )
      }
      res.redirect_with_session('/users/import/')
    })
    .catch(error => {
      console.error(
        'An error occurred when trying to import users for company' +
          req.user.company_id +
          '. Reason: ' +
          Exception.extract_system_error_message(error),
        error.stack
      )
      req.session.flash_error(
        'Failed to import users, reason: ' +
          Exception.extract_user_error_message(error)
      )
      res.redirect_with_session('/users/import/')
    })
})

router.post('/import-sample/', (req, res) => {
  req.user
    .getCompany({
      scope: ['with_active_users', 'with_simple_departments']
    })
    .then(company => {
      res.attachment(company.name_for_machine() + '.csv')

      const content = company.users.map(user => [
        user.email,
        user.slack_username,
        user.lastname,
        user.name,
        company.departments.find(dep => dep.id === user.department_id).name
      ])

      content.unshift([
        'email',
        'slack_username',
        'lastname',
        'name',
        'department'
      ])

      return csv.stringifyAsync(content)
    })
    .then(csv_data_string => res.send(csv_data_string))
})

router.get('/edit/:user_id/', (req, res) => {
  const user_id = validator.trim(req.params.user_id)

  Promise.try(() => ensure_user_id_is_integer({ req, user_id }))
    .then(() => req.user.get_company_for_user_details({ user_id }))
    .then(company => {
      const employee = company.users[0]

      return employee.promise_schedule_I_obey().then(() => {
        res.render('user_details', {
          company,
          employee,
          show_main_tab: true,
          departments: company.departments.sort((a, b) =>
            sorter(a.name, b.name)
          ),
          title: 'Edit user | TimeOff'
        })
      })
    })
    .catch(error => {
      console.error(
        'An error occurred when trying to open employee details by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      return res.redirect_with_session('../../')
    })
})

router.get('/edit/:user_id/absences/', (req, res) => {
  const user_id = validator.trim(req.params.user_id)
  let user_allowance

  const dbModel = req.app.get('db_model')

  Promise.try(() => ensure_user_id_is_integer({ req, user_id }))
    .then(() => req.user.get_company_for_user_details({ user_id }))
    .then(company => {
      const employee = company.users[0]
      return employee.reload_with_session_details()
    })
    .then(employee => employee.reload_with_leave_details({}))
    .then(employee =>
      Promise.join(
        employee
          .promise_allowance()
          .then(allowance_obj =>
            Promise.resolve([(user_allowance = allowance_obj), employee])
          ),

        employee.promise_adjustmet_for_year(moment.utc().format('YYYY')),

        employee.promise_carried_over_allowance_for_year(
          moment.utc().format('YYYY')
        ),

        (args, employee_adjustment, carried_over_allowance) => {
          args.push(null)
          args.push(employee_adjustment)
          args.push(carried_over_allowance)
          return Promise.resolve(args)
        }
      )
    )
    .then(args => {
      const allowance_obj = args[0]
      const remaining_allowance =
        allowance_obj.total_number_of_days_in_allowance -
        allowance_obj.number_of_days_taken_from_allowance
      const employee = args[1]
      const total_days_number = allowance_obj.total_number_of_days_in_allowance
      const employee_adjustment = args[3]
      const carried_over_allowance = args[4]

      const leave_statistics = {
        total_for_current_year: total_days_number,
        remaining: remaining_allowance
      }

      leave_statistics.used_so_far =
        allowance_obj.number_of_days_taken_from_allowance

      leave_statistics.used_so_far_percent =
        leave_statistics.total_for_current_year > 0
          ? (100 * leave_statistics.used_so_far) /
            leave_statistics.total_for_current_year
          : 0

      leave_statistics.remaining_percent =
        leave_statistics.total_for_current_year > 0
          ? (100 *
              (leave_statistics.total_for_current_year -
                leave_statistics.used_so_far)) /
            leave_statistics.total_for_current_year
          : 0

      return employee.promise_schedule_I_obey().then(() => {
        employee
          .promise_my_active_leaves_ever({})
          .then(leaves =>
            LeaveCollectionUtil.enrichLeavesWithComments({ leaves, dbModel })
          )
          .then(leaves => LeaveCollectionUtil.promise_to_group_leaves(leaves))
          .then(grouped_leaves => {
            res.render('user_details', {
              employee,
              grouped_leaves,
              show_absence_tab: true,
              leave_type_statistics: employee.get_leave_statistics_by_types(),
              leave_statistics,
              employee_adjustment,
              carried_over_allowance,
              user_allowance,
              title: 'Edit user | TimeOff'
            })
          })
      })
    })
    .catch(error => {
      console.error(
        'An error occurred when trying to open employee absences by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      return res.redirect_with_session('../../../')
    })
})

router.get('/edit/:user_id/schedule/', (req, res) => {
  const user_id = validator.trim(req.params.user_id)

  Promise.try(() => {
    ensure_user_id_is_integer({ req, user_id })
  })
    .then(() =>
      req.user.get_company_for_user_details({
        user_id
      })
    )
    .then(company => {
      const employee = company.users[0]

      return employee.promise_schedule_I_obey().then(schedule => {
        res.render('user_details', {
          employee,
          schedule,
          show_schedule_tab: true,
          title: 'User - Schedule | TimeOff'
        })
      })
    })
    .catch(error => {
      console.error(
        'An error occurred when trying to open employee absences by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      return res.redirect_with_session('../../../')
    })
})

router.get('/edit/:user_id/calendar/', async (req, res) => {
  const userId = validator.trim(req.params.user_id)

  const year = validator.isNumeric(req.query.year || req.body.year || '')
    ? moment.utc(req.query.year || req.body.year, 'YYYY')
    : req.user.company.get_today()

  let employee, calendar, companyEnriched, supervisors, userAllowance

  try {
    await ensure_user_id_is_integer({ req, user_id: userId })

    const company = await req.user.get_company_for_user_details({
      user_id: userId
    })

    employee = company.users[0]

    await employee.reload_with_session_details()

    calendar = await employee.promise_calendar({
      year: year.clone(),
      show_full_year: true
    })
    companyEnriched = await employee.get_company_with_all_leave_types()
    employee = await employee.reload_with_leave_details({ year })
    supervisors = await employee.promise_supervisors()
    userAllowance = await employee.promise_allowance({ year })
  } catch (error) {
    console.error(
      `An error ocurred while trying to render Calendar for user [${userId}]: ${error} at ${
        error.stack
      }`
    )

    return res.redirect_with_session('../../../')
  }

  const fullLeaveTypeStatistics = employee.get_leave_statistics_by_types()

  res.render('user_details', {
    employee,
    show_calendar_tab: true,

    calendar: calendar.map(c => c.as_for_template()),
    company: companyEnriched,
    current_user: employee,
    supervisors,
    previous_year: moment
      .utc(year)
      .add(-1, 'year')
      .format('YYYY'),
    current_year: year.format('YYYY'),
    next_year: moment
      .utc(year)
      .add(1, 'year')
      .format('YYYY'),
    show_full_year: true,
    user_allowance: userAllowance,
    leave_type_statistics: fullLeaveTypeStatistics.filter(
      st => st.days_taken > 0
    )
  })
})

// Special step performed while saving existing employee account details
//
// In case when employee had "end date" populated and now it is going
// to be updated to be in future - check if during the time user was inactive
// new user was added (including other companies)
//
function ensure_user_was_not_useed_elsewhere_while_being_inactive(args) {
  const employee = args.employee
  const new_user_attributes = args.new_user_attributes
  const req = args.req
  const model = args.model

  if (
    // Employee has end_date defined
    employee.end_date &&
    (!new_user_attributes.end_date ||
      // new "end_date" is provided
      // new "end_date" is in future
      (new_user_attributes.end_date &&
        moment
          .utc(new_user_attributes.end_date)
          .startOf('day')
          .toDate() >=
          req.user.company
            .get_today()
            .startOf('day')
            .toDate()))
  ) {
    return model.User.find_by_email(new_user_attributes.email).then(user => {
      if (user && user.company_id !== employee.company_id) {
        const error_msg =
          'There is an active account with similar email somewhere within system.'
        req.session.flash_error(error_msg)
        throw new Error(error_msg)
      }

      return Promise.resolve()
    })
  }

  return Promise.resolve()
}

// Extra step: in case when employee is going to have new email,
// check that it is not duplicated
//
function ensure_email_is_not_used_elsewhere(args) {
  const employee = args.employee
  const new_user_attributes = args.new_user_attributes
  const req = args.req
  const model = args.model

  if (new_user_attributes.email === employee.email) {
    return Promise.resolve()
  }

  return model.User.find_by_email(new_user_attributes.email).then(user => {
    if (user) {
      req.session.flash_error('Email is already in use')
      throw new Error('Email is already used')
    }

    return Promise.resolve()
  })
}

function ensure_we_are_not_removing_last_admin(args) {
  const employee = args.employee
  const new_user_attributes = args.new_user_attributes
  const req = args.req
  const model = args.model

  if (
    // It is about to change admin rights
    new_user_attributes.admin !== employee.admin &&
    // and it is revoking admin rights
    !new_user_attributes.admin
  ) {
    return model.User.count({
      where: {
        company_id: employee.company_id,
        id: { $ne: employee.id },
        admin: true
      }
    }).then(number_of_admins_to_be_left => {
      if (number_of_admins_to_be_left > 0) {
        return Promise.resolve()
      }

      req.session.flash_error(
        'This is last admin within company. Cannot revoke admin rights.'
      )
      throw new Error(
        'Attempt to revoke admin rights from last admin in comapny ' +
          employee.company_id
      )
    })
  }

  return Promise.resolve()
}

router.post('/edit/:user_id/', (req, res) => {
  const user_id = validator.trim(req.params.user_id)

  let new_user_attributes
  let employee
  const model = req.app.get('db_model')

  Promise.try(() => {
    ensure_user_id_is_integer({ req, user_id })
  })
    .then(() =>
      req.user.get_company_for_user_details({
        user_id
      })
    )
    .then(company => {
      new_user_attributes = get_and_validate_user_parameters({
        req,
        params: req.body,
        item_name: 'user',
        departments: company.departments
      })

      if (new_user_attributes.password) {
        new_user_attributes.password = model.User.hashify_password(
          new_user_attributes.password
        )
      }

      employee = company.users[0]

      return Promise.resolve()
    })

    // Ensure that new email if it was changed is not used anywhere else
    // withing system
    .then(() =>
      ensure_email_is_not_used_elsewhere({
        employee,
        new_user_attributes,
        req,
        model
      })
    )

    // Double check user in case it is re-activated
    .then(() =>
      ensure_user_was_not_useed_elsewhere_while_being_inactive({
        employee,
        new_user_attributes,
        req,
        model
      })
    )

    .then(() =>
      ensure_we_are_not_removing_last_admin({
        employee,
        new_user_attributes,
        req,
        model
      })
    )

    // All validations are passed: update database
    .then(() => {
      const adjustment = new_user_attributes.adjustment
      delete new_user_attributes.adjustment

      const captureAuditTrail = getAuditCaptureForUser({
        byUser: req.user,
        forUser: employee.get({ plain: true }),
        newAttributes: new_user_attributes
      })

      employee

        // Update user record
        .update(new_user_attributes)

        .then(() => captureAuditTrail())

        // Update adjustment if necessary
        .then(() => {
          if (adjustment !== undefined) {
            return employee.promise_to_update_adjustment({
              year: moment.utc().format('YYYY'),
              adjustment
            })
          }

          return Promise.resolve()
        })

        .then(() => {
          req.session.flash_message(
            'Details for ' + employee.full_name() + ' were updated'
          )
          return res.redirect_with_session(
            req.body.back_to_absences ? './absences/' : '.'
          )
        })
    })

    .catch(error => {
      console.error(
        'An error occurred when trying to save changes to user account by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      req.session.flash_error('Failed to save changes.')

      return res.redirect_with_session(
        req.body.back_to_absences ? './absences/' : '.'
      )
    })
})

router.post('/delete/:user_id/', (req, res) => {
  const user_id = validator.trim(req.params.user_id)
  let auditCapture
  Promise.try(() => ensure_user_id_is_integer({ req, user_id }))
    .then(() => req.user.get_company_for_user_details({ user_id }))
    .then(company => {
      const employee = company.users[0]
      const employeePlain = employee.get({ plain: true })
      auditCapture = getAuditCaptureForUser({
        byUser: req.user,
        forUser: employeePlain,
        newAttributes: Object.assign(
          {},
          ...Object.keys(employeePlain).map(k => ({ [k]: null }))
        )
      })
      return employee.remove()
    })
    .then(() => auditCapture())
    .then(result => {
      req.session.flash_message('Employee records were removed from the system')
      return res.redirect_with_session('../..')
    })
    .catch(error => {
      console.error(
        'An error occurred when trying to remove user ' +
          user_id +
          ' by user ' +
          req.user.id +
          '. Error: ' +
          error,
        error.stack
      )

      req.session.flash_error('Failed to remove user. ' + error)

      return res.redirect_with_session('../../edit/' + user_id + '/')
    })
})

router.all('/search/', (req, res) => {
  // Currently we support search only by email and only JSON type requests
  if (!req.accepts('json')) {
    // redirect client to the users index page
    return res.redirect_with_session('../')
  }

  const email = validator.trim(req.body.email || req.query.email).toLowerCase()

  if (!validator.isEmail(email)) {
    req.session.flash_error(
      'Provided email does not look like valid one: "' + email + '"'
    )
    return res.json([])
  }

  // search for users only related to currently login admin
  //
  const promise_result = req.user.getCompany({
    include: [
      {
        model: req.app.get('db_model').User,
        as: 'users',
        where: {
          email
        }
      }
    ]
  })

  promise_result.then(company => {
    if (company.users.length > 0) {
      res.json(company.users)
    } else {
      res.json([])
    }
  })
})

/* Handle the root for users section, it shows the list of all users
 * */
router.get('/', (req, res) => {
  let department_id = req.query.department
  let users_filter = {}
  const model = req.app.get('db_model')

  if (
    typeof department_id === 'number' ||
    (department_id && validator.isNumeric(department_id))
  ) {
    users_filter = { department_id }
  } else {
    department_id = undefined
  }

  req.user
    .getCompany({
      include: [
        {
          model: model.User,
          as: 'users',
          where: users_filter,
          required: false,
          include: [
            { model: model.Department, as: 'department' },
            // Following is needed to be able to calculate how many days were
            // taken from allowance
            {
              model: model.Leave,
              as: 'my_leaves',
              required: false,
              where: {
                // status : model.Leave.status_approved(),
                status: [
                  model.Leave.status_approved(),
                  model.Leave.status_new(),
                  model.Leave.status_pended_revoke()
                ],
                [Op.or]: {
                  date_start: {
                    [Op.between]: [
                      moment
                        .utc()
                        .startOf('year')
                        .format('YYYY-MM-DD'),
                      moment
                        .utc()
                        .endOf('year')
                        .format('YYYY-MM-DD HH:mm')
                    ]
                  },
                  date_end: {
                    [Op.between]: [
                      moment
                        .utc()
                        .startOf('year')
                        .format('YYYY-MM-DD'),
                      moment
                        .utc()
                        .endOf('year')
                        .format('YYYY-MM-DD HH:mm')
                    ]
                  }
                }
              },
              include: [
                {
                  model: model.LeaveType,
                  as: 'leave_type'
                }
              ] // End of my_leaves include
            }
          ]
        }
      ],
      order: [
        [{ model: model.User, as: 'users' }, 'lastname'],
        [
          { model: model.User, as: 'users' },
          { model: model.Department, as: 'department' },
          model.Department.default_order_field()
        ]
      ]
    })

    // Make sure that objects have all necessary attributes to render page
    // (template system is sync only)
    .then(company =>
      company
        .getBank_holidays()
        // stick bank holidays to company
        .then(bank_holidays => {
          company.bank_holidays = bank_holidays
          return company.getDepartments({
            order: [model.Department.default_order_field()]
          })
        })
        // stick departments to company as well
        .then(departments => {
          company.departments = departments.sort((a, b) =>
            sorter(a.name, b.name)
          )
          return Promise.resolve(company)
        })
    )

    // Make sure that user's leaves have reference back to user in question
    .then(company => {
      company.users.forEach(user => {
        user.company = company
        user.my_leaves.forEach(leave => {
          leave.user = user
        })
      })

      return Promise.resolve(company)
    })

    // Update users to have neccessary data for leave calculations
    .then(company =>
      Promise.resolve(company.users)
        .map(user => user.promise_schedule_I_obey(), {
          concurrency: 10
        })
        .then(() => Promise.resolve(company))
    )

    /*
     * Following block builds array of object for each user in company.
     * Each object consist of following keys:
     *  - user_row : reference to the sequelize user row object
     *  - number_of_days_available_in_allowance : number of days remaining in allowance for given user
     *
     * This step is necessary because we are moving to non-blocking API for libraries,
     * so we need to get all data before passing it into template as template
     *
     * */
    .then(company =>
      Promise.resolve(company.users)
        .map(
          user =>
            user.promise_allowance().then(allowance_obj =>
              Promise.resolve({
                user_row: user,
                number_of_days_available_in_allowance:
                  allowance_obj.number_of_days_available_in_allowance
              })
            ),
          {
            concurrency: 10
          }
        )
        .then(users_info => Promise.resolve([company, users_info]))
    )

    // We are moving away from passing complex objects into templates
    // for calling complicated methods from within templates
    // Now only basic simple objects to be sent over to the template,
    // all preparation to be done before rendering.
    //
    // So prepare special rendering data structure here
    .then(args => promise_user_list_data_for_rendering(args))

    .then(args => {
      const company = args[0]
      const users_info = args[1]

      if (req.query['as-csv']) {
        return users_list_as_csv({
          users_info,
          company,
          req: res,
          res
        })
      }

      res.render('users', {
        company,
        department_id: Number(department_id),
        title: company.name + "'s people",
        users_info
      })
    })
})

function promise_user_list_data_for_rendering(args) {
  const company = args[0]
  const users_info = args[1]

  const usersInfoForRendering = users_info.map(ui => ({
    user_id: ui.user_row.id,
    user_email: ui.user_row.email,
    user_slack_username: ui.user_row.slack_username,
    user_name: ui.user_row.name,
    user_lastname: ui.user_row.lastname,
    user_full_name: ui.user_row.full_name(),
    department_id: ui.user_row.department.id,
    department_name: ui.user_row.department.name,
    is_admin: ui.user_row.admin,
    number_of_days_available_in_allowance:
      ui.number_of_days_available_in_allowance,
    number_of_days_taken_from_allowance: ui.user_row.calculate_number_of_days_taken_from_allowance(),
    is_active: ui.user_row.is_active()
  }))

  const sortedUsersInfoForRendering = usersInfoForRendering.sort((a, b) =>
    sorter(a.user_lastname, b.user_lastname)
  )

  return Promise.resolve([company, sortedUsersInfoForRendering])
}

function users_list_as_csv(args) {
  const users_info = args.users_info
  const company = args.company
  const res = args.res

  // Compose file name
  res.attachment(
    company.name_for_machine() +
      '_employees_on_' +
      company.get_today().format('YYYY_MMM_DD') +
      '.csv'
  )

  // Compose result CSV header
  const content = [
    [
      'email',
      'slack_username',
      'lastname',
      'name',
      'department',
      'remaining allowance',
      'days used'
    ]
  ]

  // ... and body
  users_info.forEach(ui => {
    content.push([
      ui.user_email,
      ui.user_slack_username,
      ui.user_lastname,
      ui.user_name,
      ui.department_name,
      ui.number_of_days_available_in_allowance,
      ui.number_of_days_taken_from_allowance
    ])
  })

  return csv
    .stringifyAsync(content)
    .then(csv_data_string => res.send(csv_data_string))
}

function get_and_validate_user_parameters(args) {
  const req = args.req
  const params = args.params
  const item_name = args.item_name
  const require_password = args.require_password || false

  // Get user parameters
  const name = params.name && validator.trim(params.name)
  const lastname = params.lastname && validator.trim(params.lastname)
  const slack_username =
    params.slack_username && validator.trim(params.slack_username)
  let email = params.email_address && validator.trim(params.email_address)
  const department_id = params.department && validator.trim(params.department)
  let start_date = params.start_date && validator.trim(params.start_date)
  let end_date = params.end_date && validator.trim(params.end_date)
  const adjustment = params.adjustment && validator.trim(params.adjustment)
  const password = params.password_one && validator.trim(params.password_one)
  const password_confirm =
    params.password_confirm && validator.trim(params.password_confirm)
  const admin = (params.admin && validator.toBoolean(params.admin)) || false
  const auto_approve =
    (params.auto_approve && validator.toBoolean(params.auto_approve)) || false

  // Validate provided parameters
  if (!email || !validator.isEmail(email)) {
    req.session.flash_error(
      'New email of ' + item_name + ' should be valid email address'
    )
  }

  if (
    typeof department_id !== 'number' &&
    (!department_id || !validator.isNumeric(department_id))
  ) {
    req.session.flash_error(
      'New department number of ' + item_name + ' should be a valid number'
    )
  }

  if (adjustment && !validator.isFloat(adjustment)) {
    req.session.flash_error(
      'New allowance adjustment of ' + item_name + ' should be a valid number'
    )
  } else if (
    adjustment &&
    !(adjustment % 1 === 0 || Math.abs(adjustment % 1) === 0.5)
  ) {
    req.session.flash_error(
      'New allowance adjustment of ' +
        item_name +
        ' should be either whole integer number or with half'
    )
  }

  start_date = req.user.company.normalise_date(start_date)

  if (!start_date || !validator.toDate(start_date)) {
    req.session.flash_error(
      'New start date for ' + item_name + ' should be valid date'
    )
  }

  if (end_date) {
    end_date = req.user.company.normalise_date(end_date)

    if (!end_date || !validator.toDate(end_date)) {
      req.session.flash_error(
        'New end date for ' + item_name + ' should be valid date'
      )
    }
  }

  if (
    start_date &&
    end_date &&
    moment.utc(start_date).toDate() > moment.utc(end_date).toDate()
  ) {
    req.session.flash_error(
      'End date for ' + item_name + ' is before start date'
    )
  }

  if (password && password !== password_confirm) {
    req.session.flash_error('Confirmed password does not match initial one')
  }

  if (require_password && !password) {
    req.session.flash_error('Password is required')
  }

  if (req.session.flash_has_errors()) {
    throw new Error('Got validation errors')
  }

  // Normalize email as we operate only with lower case letters in emails
  email = email.toLowerCase()

  const attributes = {
    name,
    lastname,
    slack_username,
    email,
    department_id,
    start_date,
    end_date: end_date || null,
    admin,
    auto_approve
  }

  if (adjustment || String(adjustment) === '0') {
    attributes.adjustment = adjustment
  }

  if (password) {
    attributes.password = password
  }

  return attributes
}

function ensure_user_id_is_integer(args) {
  const req = args.req
  const user_id = args.user_id

  if (typeof user_id !== 'number' && (!user_id || !validator.isInt(user_id))) {
    throw new Error(
      'User ' +
        req.user.id +
        ' tried to edit user with non-integer ID: ' +
        user_id
    )
  }
}

module.exports = router

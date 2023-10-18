'use strict'

const { sorter } = require('../util')

const express = require('express'),
  router = express.Router(),
  validator = require('validator'),
  Promise = require('bluebird'),
  moment = require('moment'),
  config = require('../config'),
  _ = require('underscore')

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'))

function generate_all_department_allowances() {
  var allowance_options = [{ value: 0, caption: 'None' }],
    allowance = 0.5

  while (allowance <= 50) {
    allowance_options.push({ value: allowance, caption: allowance })
    allowance += 0.5
  }

  return allowance_options
}

function get_and_validate_department(args) {
  var req = args.req,
    index = args.suffix,
    company = args.company,
    // If no_suffix is set then parameter names are considered without "indexes"
    no_suffix = args.no_suffix,
    department_name = args.department_name

  function getParam(name) {
    return req.body[no_suffix ? name : name + '__' + index]
  }

  // Get user parameters
  const name = getParam('name') && validator.trim(getParam('name'))
  const allowance =
    getParam('allowance') && validator.trim(getParam('allowance'))
  const boss_id = getParam('boss_id') && validator.trim(getParam('boss_id'))

  const include_public_holidays =
    getParam('include_public_holidays') &&
    validator.toBoolean(getParam('include_public_holidays'))
  const is_accrued_allowance =
    getParam('is_accrued_allowance') &&
    validator.toBoolean(getParam('is_accrued_allowance'))

  // Validate provided parameters
  //
  // New allowance should be from range of (0;50]
  if (!validator.isFloat(allowance)) {
    session.flash_error(
      'New allowance for ' + department_name + ' should be numeric'
    )
  } else if (!(0 <= allowance && allowance <= 50)) {
    session.flash_error(
      'New allowance for ' +
        department_name +
        ' should be between 0.5 and 50 days'
    )
  }
  // New manager ID should be numeric and from within
  // current company
  if (
    typeof boss_id !== 'number' &&
    (!boss_id || !validator.isNumeric(boss_id))
  ) {
    session.flash_error(
      'New boss reference for ' + department_name + ' should be numeric'
    )
  } else if (
    !_.contains(
      _.map(company.users, function(user) {
        return String(user.id)
      }),
      String(boss_id)
    )
  ) {
    req.session.flash_error('New boss for ' + department_name + ' is unknown')
  }

  return {
    allowance: allowance,
    bossId: boss_id,
    include_public_holidays: include_public_holidays,
    is_accrued_allowance: is_accrued_allowance,
    name: name
  }
}

router.get('/departments/', function(req, res) {
  // Add JS that is specific only to current page
  res.locals.custom_java_script.push('/js/departments.js')

  var company_for_template,
    model = req.app.get('db_model')

  req.user
    .getCompany({
      scope: ['with_active_users', 'order_by_active_users']
    })
    .then(function(company) {
      company_for_template = company
      return company.getDepartments({
        scope: ['with_simple_users', 'with_boss'],
        order: [[model.Department.default_order_field()]]
      })
    })
    .then(function(departments) {
      res.render('departments_overview', {
        title: 'Settings - Departments | TimeOff',
        departments: departments.sort((a, b) => sorter(a.name, b.name)),
        allowance_options: generate_all_department_allowances(),
        company: company_for_template
      })
    })
})

router.post('/departments/', function(req, res) {
  const model = req.app.get('db_model')

  req.user
    .getCompany({
      scope: ['with_active_users']
    })
    .then(company => {
      let attributes = get_and_validate_department({
        params: req.body,
        session: req.session,
        suffix: 'new',
        company: company,
        department_name: 'New department'
      })

      if (req.session.flash_has_errors()) {
        return Promise.resolve(1)
      }

      attributes.company_id = company.id

      return model.Department.create(attributes)
    })

    .then(() => {
      if (!req.session.flash_has_errors()) {
        req.session.flash_message('Changes to departments were saved')
      }

      return res.redirect_with_session('/settings/departments/')
    })

    .catch(error => {
      console.error(
        'An error occurred when trying to add department by user ' +
          req.user.id +
          ' : ',
        error,
        error.stack
      )

      req.session.flash_error(
        'Failed to add new department, please contact customer service'
      )

      return res.redirect_with_session('/settings/departments/')
    })
})

router.post('/departments/delete/:department_id/', function(req, res) {
  var department_id = req.body.department_id,
    department_to_remove

  if (
    typeof department_id !== 'number' &&
    (!department_id || !validator.isInt(department_id))
  ) {
    console.error(
      'User ' + req.user.id + ' submited non-int department ID ' + department_id
    )

    req.session.flash_error('Cannot remove department: wronge parameters')

    return res.redirect_with_session('/settings/departments/')
  }

  req.user
    .getCompany()

    .then(function(company) {
      return company.getDepartments({
        scope: ['with_simple_users'],
        where: {
          id: department_id
        }
      })
    })
    .then(function(departments) {
      department_to_remove = departments[0]

      // Check if user specify valid department number
      if (!department_to_remove) {
        req.session.flash_error('Cannot remove department: wronge parameters')

        throw new Error(
          'User ' +
            req.user.id +
            ' tried to remove non-existing department ID' +
            department_id
        )
      }

      if (department_to_remove.users.length > 0) {
        req.session.flash_error(
          'Cannot remove department ' +
            department_to_remove.name +
            ' as it still has ' +
            department_to_remove.users.length +
            ' users.'
        )

        throw new Error('Department still has users')
      }

      // TODO VPP remove corresponding records in supervisors linking table
      return department_to_remove.destroy()
    })
    .then(function() {
      req.session.flash_message('Department was successfully removed')
      return res.redirect_with_session('/settings/departments/')
    })
    .catch(function(error) {
      console.error(
        'An error occurred when trying to edit departments by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      return res.redirect_with_session(
        department_to_remove
          ? '/settings/departments/edit/' + department_to_remove.get('id') + '/'
          : '/settings/departments/'
      )
    })
})

function promise_to_extract_company_and_department(req) {
  var department_id =
      req.body.department_id ||
      req.query.department_id ||
      req.params.department_id,
    company

  return Promise.try(function() {
    if (
      typeof department_id !== 'number' &&
      (!department_id || !validator.isInt(department_id))
    ) {
      throw new Error(
        'User ' +
          req.user.id +
          ' tried to open department refered by  non-int ID ' +
          department_id
      )
    }

    if (only_active) {
      return req.user.getCompany({
        scope: ['with_active_users', 'order_by_active_users']
      })
    } else {
      return req.user.getCompany({
        scope: ['with_all_users']
      })
    }
  })
    .then(function(c) {
      company = c

      if (!company) {
        throw new Error('Cannot determin company!')
      }

      return company.getDepartments({
        scope: ['with_simple_users', 'with_boss', 'with_supervisors'],
        where: {
          id: department_id
        }
      })
    })
    .then(function(departments) {
      var department = departments[0]

      // Ensure we have database record for given department ID
      if (!department) {
        throw new Error('Non existing department ID provided')
      }

      return Promise.resolve({
        company: company,
        department: department
      })
    })
}

router.get('/departments/edit/:department_id/', function(req, res) {
  var department_id = req.params.department_id

  Promise.try(function() {
    return promise_to_extract_company_and_department(req)
  })
    .then(function(result) {
      var department = result.department,
        company = result.company

      res.render('department_details', {
        title: 'Settings - Department details | TimeOff',
        department: department,
        company: company,
        allowance_options: generate_all_department_allowances()
      })
    })
    .catch(function(error) {
      console.error(
        'An error occurred when trying to edit department ' +
          department_id +
          ' for user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      req.session.flash_error('Failed to fetch details for given department')

      return res.redirect_with_session('/settings/departments/')
    })
})

router.post('/departments/edit/:department_id/', function(req, res) {
  var department_id = req.body['department_id'],
    company,
    department

  Promise.try(function() {
    return promise_to_extract_company_and_department(req)
  })
    .then(function(result) {
      company = result.company
      department = result.department

      return Promise.resolve(1)
    })

    .then(function() {
      if (req.body.remove_supervisor_id) {
        return promise_to_remove_supervisor({
          supervisor_id: req.body.remove_supervisor_id,
          company: company,
          department: department
        }).then(function() {
          req.session.flash_message(
            'Supervisor was removed from ' + department.name
          )
          return Promise.resolve(1)
        })
      } else if (req.body.do_add_supervisors) {
        return promise_to_update_supervisors({
          req: req,
          company: company,
          department: department
        }).then(function() {
          req.session.flash_message(
            'Supervisors were added to department ' + department.name
          )
          return Promise.resolve(1)
        })
      }

      return promise_to_update_department({
        req: req,
        company: company,
        department: department
      }).then(function() {
        req.session.flash_message(
          'Department ' + department.name + ' was updated'
        )
        return Promise.resolve(1)
      })
    })

    .then(function() {
      return res.redirect_with_session('.')
    })

    .catch(function(error) {
      console.error(
        'An error occurred when trying to update secondary superwisors for depertment ' +
          department_id +
          ' by user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      req.session.flash_error("Failed to update department's details")

      return res.redirect_with_session('../../')
    })
})

function promise_to_remove_supervisor(args) {
  var supervisor_id = args.supervisor_id,
    company = args.company,
    department = args.department

  // Make sure that provided supervisor ID belongs to user from current company
  if (
    company.users
      .map(function(u) {
        return String(u.id)
      })
      .indexOf(String(supervisor_id)) === -1
  ) {
    return Promise.resolve(1)
  }

  return department.Model.sequelize.models.DepartmentSupervisor.destroy({
    where: {
      department_id: department.id,
      user_id: supervisor_id
    }
  })
}

function promise_to_update_supervisors(args) {
  var req = args.req,
    company = args.company,
    department = args.department

  var supervisor_ids = params.supervisor_id || []

  // Take list of all users as a base of intersaction,
  // so we use submitted data only as criteria and do not save it in database
  supervisor_ids = company.users
    .map(function(user) {
      return user.id
    })
    .filter(function(id) {
      return supervisor_ids.indexOf(String(id)) !== -1
    })

  var link_model = department.Model.sequelize.models.DepartmentSupervisor

  return link_model
    .destroy({
      where: {
        department_id: department.id
      }
    })
    .then(function() {
      return link_model.bulkCreate(
        supervisor_ids.map(function(id) {
          return { user_id: id, department_id: department.id }
        })
      )
    })
}

function promise_to_update_department(args) {
  var req = args.req,
    company = args.company,
    department = args.department

  var attributes = get_and_validate_department({
    company: company,
    department_name: department.name,
    no_suffix: true,
    req: req
  })

  // If there were any validation errors: do not update department
  if (req.session.flash_has_errors()) {
    throw new Error(
      'Invalid parameters submitted while while attempt to update department details'
    )
  }

  return department.update(attributes)
}

router.get('/departments/available-supervisors/:department_id/', function(
  req,
  res
) {
  var department_id = req.params.department_id,
    department,
    company

  Promise.try(function() {
    return promise_to_extract_company_and_department(req)
  })
    .then(function(result) {
      department = result.department
      company = result.company

      return department.promise_me_with_supervisors()
    })

    .then(function(department_with_supervisors) {
      var supervisor_map = {}

      department_with_supervisors.supervisors.forEach(function(user) {
        supervisor_map[user.id] = true
      })

      res.render('department/available_supervisors', {
        layout: false,
        users: _.map(
          _.filter(company.users, function(user) {
            return user.id !== department.bossId
          }),
          function(user) {
            user._marked = supervisor_map[user.id]
            return user
          }
        ),
        title: 'Settings - Department Available Supervisors | TimeOff'
      })
    })
    .catch(function(error) {
      console.error(
        'An error occurred when trying to get all availabele superviers for department ' +
          department_id +
          ' for user ' +
          req.user.id +
          ' : ' +
          error,
        error.stack
      )

      res.send('REQUEST FAILED')
    })
})

module.exports = router

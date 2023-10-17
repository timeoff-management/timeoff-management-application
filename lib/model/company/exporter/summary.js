'use strict'

const Promise = require('bluebird'),
  CSV = Promise.promisifyAll(require('csv')),
  moment = require('moment'),
  Joi = require('joi')

const schema_constructor = Joi.object()
  .required()
  .keys({
    company: Joi.object().required(),
    users: Joi.array().required()
  })

const { sorter } = require('../../../util')

class CompanySummary {
  constructor(args) {
    args = Joi.attempt(
      args,
      schema_constructor,
      'Failed to in stantiate companySummary due to validation'
    )

    this._company = args.company
    this._users = args.users
  }

  get company() {
    return this._company
  }
  get users() {
    return this._users
  }

  as_csv_data() {
    let self = this,
      results = [],
      date_format = self.company.get_default_date_format(),
      departmentsMap = {},
      leaveTypesMap = {}

    // Fill departments map
    self.company.departments.forEach(d => (departmentsMap[d.id] = d))

    // Fill leave types map
    self.company.leave_types.forEach(lt => (leaveTypesMap[lt.id] = lt))

    // Put headers
    results.push([
      'Department',
      'Last name',
      'Name',
      'Email address',
      'Type of absence',
      'Started at',
      'Date type',
      'Ended at',
      'Date type'
    ])

    self.users
      // Sort users by departments and by last names
      .sort(
        (a, b) =>
          sorter(
            departmentsMap[a.DepartmentId].name,
            departmentsMap[b.DepartmentId].name
          ) || sorter(a.lastname, b.lastname)
      )
      // Get a row per every leave
      .forEach(u =>
        u.my_leaves.forEach(l => {
          const start_date = moment(l.date_start).format(date_format)
          const end_date = moment(l.date_end).format(date_format)

          const startDatePart = l.does_start_half_morning()
            ? 'Morning'
            : l.does_start_half_afternoon()
            ? 'Afternoon'
            : 'All Day'

          const endDatePart =
            start_date === end_date
              ? startDatePart
              : l.does_end_half_morning()
              ? 'Morning'
              : l.does_end_half_afternoon()
              ? 'Afternoon'
              : 'All Day'

          results.push([
            departmentsMap[u.DepartmentId].name,
            u.lastname,
            u.name,
            u.email,
            leaveTypesMap[l.leaveTypeId].name,
            start_date,
            startDatePart,
            end_date,
            endDatePart
          ])
        })
      )

    return results
  }

  promise_as_csv_string() {
    const self = this

    return Promise.resolve(self.as_csv_data()).then(data =>
      CSV.stringifyAsync(data)
    )
  }
}

module.exports = CompanySummary

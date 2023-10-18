'use strict'

const moment = require('moment')
const _ = require('underscore')
const Promise = require('bluebird')
const Exception = require('../../error')
const CalendarMonth = require('../calendar_month')

module.exports = function(sequelize, DataTypes) {
  const Department = sequelize.define(
    'Department',
    {
      // TODO add validators!
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      allowance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      include_public_holidays: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_accrued_allowance: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      indexes: [
        {
          fields: ['company_id']
        },
        {
          fields: ['id']
        }
      ]
    }
  )

  Department.loadScope = function(models) {
    Department.addScope('with_simple_users', {
      include: [{ model: models.User, as: 'users' }]
    })

    Department.addScope('with_boss', {
      include: [{ model: models.User, as: 'boss' }]
    })

    Department.addScope('with_supervisors', {
      include: [{ model: models.User, as: 'supervisors' }]
    })
  }

  Department.associate = function(models) {
    // We have constrains OFF as to prevent ORM complaining about
    // cycle reference
    Department.belongsTo(models.User, { as: 'boss', constraints: false })
    Department.belongsTo(models.Company, { as: 'company' })
    Department.hasMany(models.User, { as: 'users' })

    Department.hasMany(models.DepartmentSupervisor, {
      as: 'supervisors_link',
      foreignKey: { name: 'department_id', allowNull: false }
    })

    Department.belongsToMany(models.User, {
      as: 'supervisors',
      foreignKey: 'department_id',
      otherKey: 'user_id',
      through: models.DepartmentSupervisor
    })
  }

  Department.default_order_field = function() {
    return 'name'
  }

  // Return users related to current department and still active
  Department.prototype.promise_active_users = function() {
    return this.getUsers({
      where: sequelize.models.User.get_active_user_filter()
    })
  }

  Department.prototype.promise_team_view_for_month = function(month) {
    return this._promise_team_view({ start_date: month })
  }

  Department.prototype.promise_team_view_for_months_range = function(
    start_month,
    end_month
  ) {
    return this._promise_team_view({
      start_date: start_month,
      end_date: end_month
    })
  }

  Department.prototype._promise_team_view = function(args) {
    const self = this
    const model = sequelize.models
    let start_date = args.start_date
    let end_date = args.end_date

    const promise_users_and_leaves = Promise

      // First of all ensure that "start_date" is defined
      .try(() => {
        if (start_date) {
          return Promise.resolve(start_date)
        }

        return self
          .getCompany()
          .then(company => Promise.resolve((start_date = company.get_today())))
      })

      // Ensure end_date is suitable if it was provided
      .then(() => {
        // If end_date was not provided: no need to validate it: set it to be equal to start date
        if (!end_date) {
          end_date = start_date

          return Promise.resolve()
        }

        // If end date is privided...
        // ... ensure start and end dates are from within same year
        if (
          moment.utc(end_date).format('YYYY') !==
          moment.utc(start_date).format('YYYY')
        ) {
          Exception.throw_user_error({
            user_error: 'Start and End dates should within single year',
            system_error:
              '_promise_team_view was called with start_date and end_date from different years.'
          })
        }

        // ... ensure that start date proceed end date
        if (
          moment.utc(start_date).dayOfYear() > moment.utc(end_date).dayOfYear()
        ) {
          Exception.throw_user_error({
            user_error: 'Start date needs to be before end date',
            system_error:
              '_promise_team_view was called with end_date prior to start_date'
          })
        }

        return Promise.resolve()
      })

      // Get users
      .then(() => self.promise_active_users())
      .then(
        users =>
          Promise.all(
            _.map(users, user =>
              user
                .promise_my_leaves_for_calendar({
                  year: start_date
                })
                .then(leaves => {
                  const leave_days = _.flatten(
                    _.map(leaves, leave =>
                      _.map(leave.get_days(), leave_day => {
                        leave_day.leave = leave
                        return leave_day
                      })
                    )
                  )

                  return user.promise_schedule_I_obey().then(schedule =>
                    Promise.resolve({
                      user,
                      leave_days,
                      schedule
                    })
                  )
                })
            ) // End of map
          ) // End of promise_users_and_leaves
      )

    const promise_company = self.getCompany({
      include: [
        { model: model.BankHoliday, as: 'bank_holidays' },
        { model: model.LeaveType, as: 'leave_types' }
      ]
    })

    return Promise.join(
      promise_company,
      promise_users_and_leaves,
      (company, users_and_leaves) => {
        const number_of_months =
          moment.utc(end_date).month() - moment.utc(start_date).month()

        users_and_leaves.forEach(user_data => {
          user_data.days = []

          // Now iterate throw all monthes between start and end dates
          // and get calendar months for each
          // and then combined them all togather
          for (let i = 0; i <= number_of_months; i++) {
            const calendar_month = new CalendarMonth(
              moment
                .utc(start_date)
                .clone()
                .add(i, 'months'),
              {
                bank_holidays: self.include_public_holidays
                  ? _.map(company.bank_holidays, day => day.date)
                  : [],
                leave_days: user_data.leave_days,
                schedule: user_data.schedule,
                today: company.get_today(),
                leave_types: company.leave_types
              }
            )

            user_data.days.push(calendar_month.as_for_team_view())
          } // end of for
          user_data.days = _.flatten(user_data.days)
        })

        return Promise.resolve(users_and_leaves)
      }
    )
  } // End of promise_team_view

  // Return new department object that is based on same ID but include all supervisors
  Department.prototype.promise_me_with_supervisors = function() {
    const self = this

    return self.Model.scope('with_supervisors').findByPk(self.id)
  }

  return Department
}

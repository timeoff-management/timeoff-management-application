/*
 * This is a role to be applied to user model that injects getters necessary
 * for fetching related company object with different level of details.
 *
 * Well.. to be precise that role is applied to the object that is used as
 * a spec for instance method for User objects.
 *
 * */

'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

const { sorter } = require('../../../util')

module.exports = function(sequelize) {
  /* Fetch company object associated with current user, the company object
   * includes all necessary associations for building user detail page
   * for user determined by user_id.
   * Returns promise that is resolved with company object as parameter
   */
  //
  // TODO: Query below needs to be revisited as it is slow for users
  // with many leaves
  //
  this.get_company_for_user_details = function(args) {
    const user_id = args.user_id
    const year = args.year || moment.utc()
    const current_user = this

    return (
      this.getCompany({
        include: [
          {
            model: sequelize.models.User,
            as: 'users',
            where: { id: user_id },
            include: [
              // Following is needed to be able to calculate how many days were
              // taked from allowance
              {
                model: sequelize.models.Leave,
                as: 'my_leaves',
                required: false,
                where: {
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
                    model: sequelize.models.LeaveType,
                    as: 'leave_type'
                  },
                  {
                    model: sequelize.models.User,
                    as: 'user',
                    include: [
                      {
                        model: sequelize.models.Company,
                        as: 'company',
                        include: [
                          {
                            model: sequelize.models.BankHoliday,
                            as: 'bank_holidays'
                          }
                        ]
                      }
                    ]
                  }
                ] // End of my_leaves include
              },
              {
                model: sequelize.models.Department,
                as: 'department'
              }
            ]
          },
          {
            model: sequelize.models.Department,
            as: 'departments',
            include: {
              model: sequelize.models.User,
              as: 'manager'
            }
          }
        ],
        order: [
          [
            { model: sequelize.models.Department, as: 'departments' },
            sequelize.models.Department.default_order_field()
          ]
        ]
      })

        // Make sure that company got only one user associated with for
        // provided user_id
        .then(company => {
          if (!company || company.users.length !== 1) {
            throw new Error(
              'User ' +
                current_user.id +
                ' tried to edit user ' +
                user_id +
                ' but they do not share a company'
            )
          }

          return Promise.resolve(company)
        })
    )
  }

  this.get_company_for_add_user = function() {
    const model = sequelize.models

    return this.getCompany({
      include: [{ model: model.Department, as: 'departments' }],
      order: [
        [
          { model: model.Department, as: 'departments' },
          model.Department.default_order_field()
        ]
      ]
    })
  }

  this.get_company_with_all_leave_types = function() {
    return this.getCompany({
      include: [
        {
          model: sequelize.models.LeaveType,
          as: 'leave_types'
        }
      ],
      order: [
        [
          { model: sequelize.models.LeaveType, as: 'leave_types' },
          'sort_order',
          'DESC'
        ],
        [{ model: sequelize.models.LeaveType, as: 'leave_types' }, 'name']
      ]
    })
  }
}

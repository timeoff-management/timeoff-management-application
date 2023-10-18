'use strict'

const Joi = require('joi')
const Promise = require('bluebird')
const Exception = require('../../error')
const Models = require('../db')

const schemaPromiseToRemove = Joi.object()
  .required()
  .keys({
    company: Joi.object().required(), // .type(Models.Company.constructor),
    byUser: Joi.object().required(), // .type(Models.User.constructor),
    confirmName: Joi.string()
      .required()
      .trim()
  })

class CompanyRemover {
  static promiseToRemove(args) {
    args = Joi.attempt(
      args,
      schemaPromiseToRemove,
      'Param validation failed for promiseToRemove'
    )

    const company = args.company
    const byUser = args.byUser
    const confirmName = args.confirmName

    // Ensure that confirm name is correct
    const normalizedNames = [company.name, confirmName]
      .map(s => s.trim())
      .map(s => s.replace(/\s+/g, ''))
      .map(s => s.toUpperCase())

    if (normalizedNames[0] !== normalizedNames[1]) {
      Exception.throw_user_error({
        system_error: `Confirmed name does not match one on company record: ${normalizedNames.join(
          ', '
        )}`,
        user_error: 'Provided name confirmation does not match company one'
      })
    }

    return (
      Models.User

        // Ensure user belongs to current combany and is admin
        .count({
          where: {
            id: byUser.id,
            company_id: company.id,
            admin: true
          }
        })
        .then(count => {
          if (count === 0) {
            Exception.throw_user_error({
              system_error: `An attempt to remove company [${
                company.id
              }] by unrelated user [${byUser.id}]`,
              user_error: 'User does not have permissions to remove company'
            })
          }
          return Promise.resolve(1)
        })

        // Remove company record and all related records
        // (we do not really remove all data, just the sensitive information)
        // .. delete email audit
        .then(() =>
          Models.EmailAudit.destroy({ where: { company_id: company.id } })
        )
        // Remove all leaves for related users
        .then(() =>
          company
            .getUsers()
            .map(u => Models.Leave.destroy({ where: { userId: u.id } }))
        )
        // Remove all users
        .then(() => Models.User.destroy({ where: { company_id: company.id } }))
        // Remove company record
        .then(() => company.destroy())
    )
  }
}

module.exports = CompanyRemover

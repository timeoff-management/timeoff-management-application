'use strict'

const Joi = require('joi'),
  Promise = require('bluebird'),
  CompanySummary = require('./summary')

const constructor_schema = Joi.object()
    .required()
    .keys({
      dbSchema: Joi.object().required()
    }),
  schemaPromiseCompanySummary = Joi.object()
    .required()
    .keys({
      company: Joi.object().required()
    })

class CompanyExporter {
  constructor(args) {
    args = Joi.attempt(
      args,
      constructor_schema,
      'Faled to instantiate new companyExporter due to arguments validation'
    )

    this._db_model = args.dbSchema
  }

  get dbModel() {
    return this._db_model
  }

  promiseCompanySummary(args) {
    args = Joi.attempt(
      args,
      schemaPromiseCompanySummary,
      'Failed to get company summary die to validation errors'
    )

    let self = this,
      company = args.company

    return Promise.join(
      self.dbModel.Company.scope(
        'with_simple_departments',
        'with_leave_types'
      ).findOne({
        where: { id: company.id }
      }),
      self.dbModel.User.scope('with_simple_leaves').findAll({
        where: { company_id: company.id }
      }),
      (company, users) =>
        Promise.resolve(
          new CompanySummary({
            company: company,
            users: users
          })
        )
    )
  }
}

module.exports = CompanyExporter

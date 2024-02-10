'use strict'

const moment = require('moment')
const _ = require('underscore')
const config = require('../../config')

module.exports = function(sequelize, DataTypes) {
  const BankHoliday = sequelize.define(
    'BankHoliday',
    {
      // TODO add validators!
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      underscored: true,
      indexes: [
        {
          fields: ['company_id']
        }
      ]
    }
  )

  BankHoliday.associate = function(models) {
    BankHoliday.belongsTo(models.Company, {
      as: 'company',
      foreignKey: { name: 'company_id', allowNull: false }
    })
  }

  BankHoliday.generate_bank_holidays = function(args) {
    const company = args.company
    const country_code = args.country_code

    let bank_holidays = [
      {
        name: 'Early May bank holiday',
        date: '2015-05-04',
        company_id: company.id
      }
    ]

    const config_countries = config.get('countries')

    if (
      config_countries.country_code &&
      config_countries[country_code].bank_holidays &&
      config_countries[country_code].bank_holidays.length > 0
    ) {
      bank_holidays = _.map(
        config_countries[country_code].bank_holidays,
        bh => ({
          name: bh.name,
          date: bh.date,
          company_id: company.id
        })
      )
    }

    return BankHoliday.bulkCreate(bank_holidays)
  }

  BankHoliday.prototype.get_pretty_date = function() {
    return moment.utc(this.date).format('YYYY-MM-DD')
  }

  return BankHoliday
}

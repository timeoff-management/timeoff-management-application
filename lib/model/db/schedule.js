'use strict'

var moment = require('moment'),
  Promise = require('bluebird')

function works_whole_day() {
  return 1
}
function works_none() {
  return 2
}
function works_morning() {
  return 3
}
function works_afternoon() {
  return 4
}

function week_day_flag_setter(flag_name) {
  return function(v) {
    this.setDataValue(flag_name, v ? works_whole_day() : works_none())
  }
}

module.exports = function(sequelize, DataTypes) {
  var Schedule = sequelize.define(
    'Schedule',
    {
      monday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_whole_day(),
        set: week_day_flag_setter('monday')
      },
      tuesday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_whole_day(),
        set: week_day_flag_setter('tuesday')
      },
      wednesday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_whole_day(),
        set: week_day_flag_setter('wednesday')
      },
      thursday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_whole_day(),
        set: week_day_flag_setter('thursday')
      },
      friday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_whole_day(),
        set: week_day_flag_setter('friday')
      },
      saturday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_none(),
        set: week_day_flag_setter('saturday')
      },
      sunday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: works_none(),
        set: week_day_flag_setter('sunday')
      }
    },
    {
      underscored: true,
      freezeTableName: true,
      tableName: 'schedule',

      indexes: [{ fields: ['user_id'] }, { fields: ['company_id'] }],

      validate: {
        relatesToEitherUserOrCompanyButNotBoth: function() {
          if (this.company_id && this.user_id) {
            console.error(
              'company_id=' + this.company_id + ', user_id=' + this.user_id
            )
            throw new Error(
              'Schedule should be connected either to company of to user but not to both'
            )
          }
        },

        relatesToUserOrCompany: function() {
          if (!this.company_id && !this.user_id) {
            console.error(
              'company_id=' + this.company_id + ', user_id=' + this.user_id
            )
            throw new Error(
              'Schedule needs to be related to eaither company or user'
            )
          }
        }
      }
    }
  )

  Object.assign(Schedule, {
    associate: function(models) {
      Schedule.belongsTo(models.Company, {
        as: 'company',
        foreignKey: 'company_id'
      })
      Schedule.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
    },

    promise_to_build_default_for: function(args) {
      var company_id = args.company_id,
        user_id = args.user_id

      if (!company_id && !user_id) {
        throw new Error('Needs to have either company_id or user_id')
      }

      var default_schedule = sequelize.models.Schedule.build({
        company_id: company_id,
        user_id: user_id
      })

      return Promise.resolve(default_schedule)
    }
  })

  Object.assign(Schedule.prototype, {
    is_user_specific: function() {
      return !!this.user_id
    },

    is_it_working_day: function(args) {
      var day = args.day

      if (!day) {
        throw new Error('"is_it_working_day" requires to have "day" parameter')
      }

      return (
        this[
          moment
            .utc(day)
            .format('dddd')
            .toLowerCase()
        ] === works_whole_day()
      )
    },

    works_monday: function() {
      return this.monday === works_whole_day()
    },

    works_tuesday: function() {
      return this.tuesday === works_whole_day()
    },

    works_wednesday: function() {
      return this.wednesday === works_whole_day()
    },

    works_thursday: function() {
      return this.thursday === works_whole_day()
    },

    works_friday: function() {
      return this.friday === works_whole_day()
    },

    works_saturday: function() {
      return this.saturday === works_whole_day()
    },

    works_sunday: function() {
      return this.sunday === works_whole_day()
    }
  })

  return Schedule
}

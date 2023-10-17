'use strict'

const models = require('../lib/model/db')

module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.describeTable('Companies').then(attributes => {
      if (attributes.hasOwnProperty('carry_over')) {
        return 1
      }

      return queryInterface.addColumn(
        'Companies',
        'carry_over',
        models.Company.attributes.carry_over
      )
    })
  },

  down: function(queryInterface, Sequelize) {
    return queryInterface.removeColumn('Companies', 'carry_over')
  }
}

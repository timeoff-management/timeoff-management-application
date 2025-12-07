'use strict'

const models = require('../lib/model/db')

module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.describeTable('Companies').then(attributes => {
      if (attributes.hasOwnProperty('is_team_view_hidden')) {
        return 1
      }

      return queryInterface.addColumn(
        'Companies',
        'is_team_view_hidden',
        models.Company.attributes.is_team_view_hidden
      )
    })
  },

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn('Companies', 'is_team_view_hidden')
}

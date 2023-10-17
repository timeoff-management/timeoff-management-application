'use strict'

var models = require('../lib/model/db')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .describeTable('Companies')
      .then(attributes => {
        if (attributes.hasOwnProperty('integration_api_token')) {
          return 1
        }

        return queryInterface.addColumn(
          'Companies',
          'integration_api_token',
          models.Company.attributes.integration_api_token
        )
      })
      .then(() =>
        queryInterface.describeTable('Companies').then(attributes => {
          if (attributes.hasOwnProperty('integration_api_enabled')) {
            return 1
          }

          return queryInterface.addColumn(
            'Companies',
            'integration_api_enabled',
            models.Company.attributes.integration_api_enabled
          )
        })
      )
  },

  down: (queryInterface, Sequelize) =>
    queryInterface
      .removeColumn('Companies', 'integration_api_token')
      .then(() =>
        queryInterface.removeColumn('Companies', 'integration_api_enabled')
      )
}

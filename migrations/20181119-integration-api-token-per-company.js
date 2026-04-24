
'use strict';

var models = require('../lib/model/db');

module.exports = {
  up: (queryInterface, Sequelize) => {

    return queryInterface.describeTable('Companies').then(attributes => {

      const addToken = attributes.hasOwnProperty('integration_api_token')
        ? Promise.resolve()
        : queryInterface.addColumn('Companies', 'integration_api_token', models.Company.attributes.integration_api_token);

      const addEnabled = attributes.hasOwnProperty('integration_api_enabled')
        ? Promise.resolve()
        : queryInterface.addColumn('Companies', 'integration_api_enabled', models.Company.attributes.integration_api_enabled);

      return addToken.then(() => addEnabled);
    });

  },

  down: (queryInterface, Sequelize) => queryInterface
    .removeColumn('Companies', 'integration_api_token')
    .then(() => queryInterface.removeColumn('Companies', 'integration_api_enabled')),
};

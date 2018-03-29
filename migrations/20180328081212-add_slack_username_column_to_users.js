
'use strict';

var models = require('../lib/model/db');

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.describeTable('Users')
      .then(function (attributes) {

        if (attributes.hasOwnProperty('slack_username')) {
          return 1;
        }

        return queryInterface.addColumn(
          'Users',
          'slack_username',
          models.User.attributes.slack_username
        );
      });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface
      .removeColumn('Users', 'slack_username');
  }
};


'use strict';

var models = require('../lib/model/db');

module.exports = {
  up: (queryInterface, Sequelize) => {

    queryInterface.describeTable('Companies').then(attributes => {

      if (attributes.hasOwnProperty('holiday_year_start_date')) {
        return 1;
      }

      return queryInterface.addColumn(
        'Companies',
        'holiday_year_start_date-date',
        models.Company.attributes.holiday_year_start_date
      );
    });
  },

  down: (queryInterface, Sequelize) => queryInterface
    .removeColumn('Companies', 'holiday_year_start_date'),
};

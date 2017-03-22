'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    /*return queryInterface.addColumn(
      'Companies',
      'date_format',
      {
        type         : Sequelize.STRING,
        allowNull    : false,
        defaultValue : 'YYYY-MM-DD',
      }
    );*/
    return true;
  },

  down: function (queryInterface, Sequelize) {
    //return queryInterface.removeColumn('Companies', 'date_format');
    return true;
  }
};

'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.renameColumn('Departments', 'allowence', 'allowance');
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.renameColumn('Departments', 'allowance', 'allowence');
  }
};

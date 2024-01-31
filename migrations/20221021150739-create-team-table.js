'use strict';

const { sequelize } = require("../lib/model/db");

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Teams', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.DataTypes.STRING
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Teams');
  }
};

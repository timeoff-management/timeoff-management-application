"use strict";

var models = require("../lib/model/db"),
  Promise = require("bluebird");

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface
      .createTable(
        models.UserAllowanceAdjustment.tableName,
        models.UserAllowanceAdjustment.attributes
      )
      .then(() => queryInterface.describeTable("Users"))
      .then(function (attributes) {
        if (!attributes.hasOwnProperty("adjustment")) {
          return Promise.resolve();
        }

        let sql =
          "INSERT INTO user_allowance_adjustment (year, adjustment, user_id, created_at) " +
          "SELECT 2017 AS year, adjustment as adjustment, id as user_id, date() || ' ' || time() as created_at " +
          "FROM users";

        return queryInterface.sequelize.query(sql);
      })

      .then(() => Promise.resolve());
  },

  down: function (queryInterface, Sequelize) {
    // No way back!
    return Promise.resolve();
  },
};

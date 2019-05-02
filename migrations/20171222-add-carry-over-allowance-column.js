"use strict";

var models = require("../lib/model/db");

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface
      .describeTable("user_allowance_adjustment")
      .then(function(attributes) {
        if (attributes.hasOwnProperty("carried_over_allowance")) {
          return 1;
        }

        return queryInterface.addColumn(
          "user_allowance_adjustment",
          "carried_over_allowance",
          models.UserAllowanceAdjustment.attributes.carried_over_allowance
        );
      });
  },

  down: function(queryInterface, Sequelize) {
    return queryInterface.removeColumn(
      "user_allowance_adjustment",
      "carried_over_allowance"
    );
  }
};

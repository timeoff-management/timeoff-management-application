"use strict";

var models = require("../lib/model/db");

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface
      .describeTable("Companies")
      .then(function (attributes) {
        if (attributes.hasOwnProperty("timezone")) {
          return 1;
        }

        return queryInterface.addColumn(
          "Companies",
          "timezone",
          models.Company.attributes.timezone
        );
      });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn("Companies", "timezone");
  },
};

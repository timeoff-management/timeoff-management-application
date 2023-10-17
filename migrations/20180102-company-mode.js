"use strict";

var models = require("../lib/model/db");

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.describeTable("Companies").then(function(attributes) {
      if (attributes.hasOwnProperty("mode")) {
        return 1;
      }

      return queryInterface.addColumn(
        "Companies",
        "mode",
        models.Company.attributes.mode
      );
    });
  },

  down: function(queryInterface, Sequelize) {
    return queryInterface.removeColumn("Companies", "mode");
  }
};

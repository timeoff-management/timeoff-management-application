"use strict";

var models = require("../lib/model/db");

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface
      .describeTable("Departments")
      .then(function (attributes) {
        if (attributes.hasOwnProperty("is_accrued_allowance")) {
          return 1;
        }

        return queryInterface.addColumn(
          "Departments",
          "is_accrued_allowance",
          models.Department.attributes.is_accrued_allowance
        );
      });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn("Departments", "is_accrued_allowance");
  },
};

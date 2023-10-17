"use strict";

var models = require("../lib/model/db");

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.describeTable("LeaveTypes").then(function (attributes) {
      if (attributes.hasOwnProperty("sort_order")) {
        return 1;
      }

      return queryInterface.addColumn(
        "LeaveTypes",
        "sort_order",
        models.LeaveType.attributes.sort_order
      );
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn("LeaveTypes", "sort_order");
  },
};

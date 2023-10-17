"use strict"

var models = require("../lib/model/db")

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.describeTable("Companies").then(function(attributes) {
      if (attributes.hasOwnProperty("company_wide_message")) {
        return 1
      }

      return queryInterface.addColumn(
        "Companies",
        "company_wide_message",
        models.Company.attributes.company_wide_message
      )
    })
  },

  down: function(queryInterface, Sequelize) {
    return queryInterface.removeColumn("Companies", "company_wide_message")
  }
}

"use strict";

var models = require("../lib/model/db"),
  Promise = require("bluebird");

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.describeTable("Users").then(attributes => {
      if (!attributes.hasOwnProperty("adjustment")) {
        return Promise.resolve();
      }

      if ("sqlite" !== queryInterface.sequelize.getDialect()) {
        // For non SQLite: it is easy
        return queryInterface.removeColumn(models.User.tableName, "adjustment");
      }

      // For SQLite it is "fun"

      return (
        queryInterface
          // Create Temp Users based on current model definitiom
          .createTable("Users_backup", models.User.attributes)

          .then(function() {
            return queryInterface.sequelize.query("PRAGMA foreign_keys=off;");
          })

          // Copy data form original Users into new Temp one
          .then(function() {
            return queryInterface.sequelize.query(
              "INSERT INTO `Users_backup` (`id`, `email`, `password`, `name`, `lastname`, `activated`, `admin`, `start_date`, `end_date`, `createdAt`, `updatedAt`, `company_id`, `department_id`, `auto_approve`) SELECT `id`, `email`, `password`, `name`, `lastname`, `activated`, `admin`, `start_date`, `end_date`, `createdAt`, `updatedAt`, `company_id`, `department_id`, `auto_approve` FROM `" +
                models.User.tableName +
                "`"
            );
          })

          .then(() => queryInterface.dropTable(models.User.tableName))
          .then(() =>
            queryInterface.renameTable("Users_backup", models.User.tableName)
          )
          .then(() => queryInterface.sequelize.query("PRAGMA foreign_keys=on;"))
          .then(() =>
            queryInterface.addIndex(models.User.tableName, ["company_id"])
          )
      );
    });
  },

  down: function(queryInterface, Sequelize) {
    // No way back!
    return Promise.resolve();
  }
};

"use strict"

const models = require("../lib/model/db")

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.describeTable("Companies").then(attributes => {
      if (attributes.integration_api_token.type === "UUID") {
        return 1
      }

      return (
        queryInterface
          // Create Temp Compaies based on current model definitiom
          .createTable("Companies_backup", models.Company.attributes)
          .then(() =>
            queryInterface.sequelize.query("PRAGMA foreign_keys=off;")
          )
          .then(() =>
            queryInterface.sequelize.query(
              "INSERT INTO `Companies_backup` (`id`,`name`,`country`,`start_of_new_year`,`createdAt`,`updatedAt`,share_all_absences,ldap_auth_enabled,ldap_auth_config,`date_format`,`company_wide_message`,`mode`,`timezone`,`integration_api_token`,`integration_api_enabled`,`carry_over`) SELECT `id`,`name`,`country`,`start_of_new_year`,`createdAt`,`updatedAt`,share_all_absences,ldap_auth_enabled,ldap_auth_config,`date_format`,`company_wide_message`,`mode`,`timezone`,`integration_api_token`,`integration_api_enabled`,`carry_over` FROM `" +
                models.Company.tableName +
                "`"
            )
          )
          .then(() => queryInterface.dropTable(models.Company.tableName))
          .then(() =>
            queryInterface.renameTable(
              "Companies_backup",
              models.Company.tableName
            )
          )
          .then(() => queryInterface.sequelize.query("PRAGMA foreign_keys=on;"))
          .then(() => queryInterface.addIndex(models.Company.tableName, ["id"]))
      )
    })
  },

  down: function(queryInterface, Sequelize) {
    // No way back!
    return Promise.resolve()
  }
}

"use strict";

const models = require("../lib/model/db");

module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.describeTable("Comment").then(async attributes => {
      if (attributes.entity_type) {
        return 1;
      }

      await queryInterface
        .renameColumn("Comment", "entityType", "entity_type");

      await queryInterface
        .renameColumn("Comment", "entityId", "entity_id");
    });

    await queryInterface.describeTable("Audit").then(async attributes => {
      if (attributes.entity_type) {
        return 1;
      }

      await queryInterface
        .renameColumn("Audit", "entityType", "entity_type");

      await queryInterface
        .renameColumn("Audit", "entityId", "entity_id");

      await queryInterface
        .renameColumn("Audit", "oldValue", "old_value");

      await queryInterface
        .renameColumn("Audit", "newValue", "new_value");
    });
  },

  down: function(queryInterface, Sequelize) {
    // No way back!
    return Promise.resolve();
  }
};

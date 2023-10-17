"use strict";

const models = require("../lib/model/db");

module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.describeTable("Comment").then(async attributes => {
      if (attributes.entityType) {
        await queryInterface.renameColumn(
          "Comment",
          "entityType",
          "entity_type"
        );
      }

      if (attributes.entityId) {
        await queryInterface.renameColumn("Comment", "entityId", "entity_id");
      }

      if (attributes.companyId) {
        await queryInterface.renameColumn("Comment", "companyId", "company_id");
      }
    });

    await queryInterface.describeTable("Audit").then(async attributes => {
      if (attributes.entityType) {
        await queryInterface.renameColumn("Audit", "entityType", "entity_type");
      }

      if (attributes.entityId) {
        await queryInterface.renameColumn("Audit", "entityId", "entity_id");
      }

      if (attributes.oldValue) {
        await queryInterface.renameColumn("Audit", "oldValue", "old_value");
      }

      if (attributes.newValue) {
        await queryInterface.renameColumn("Audit", "newValue", "new_value");
      }
    });

    await queryInterface.describeTable("Company").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn("Company", "companyId", "company_id");
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "Company",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("Department").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn(
          "Department",
          "companyId",
          "company_id"
        );
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "Department",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("BankHoliday").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn(
          "BankHoliday",
          "companyId",
          "company_id"
        );
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "BankHoliday",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface
      .describeTable("DepartmentSupervisor")
      .then(async attributes => {
        if (attributes.companyId) {
          await queryInterface.renameColumn(
            "DepartmentSupervisor",
            "companyId",
            "company_id"
          );
        }

        if (attributes.DepartmentId) {
          await queryInterface.renameColumn(
            "DepartmentSupervisor",
            "DepartmentId",
            "department_id"
          );
        }
      });

    await queryInterface.describeTable("EmailAudit").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn(
          "EmailAudit",
          "companyId",
          "company_id"
        );
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "EmailAudit",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("Leave").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn("Leave", "companyId", "company_id");
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "Leave",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("LeaveType").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn(
          "LeaveType",
          "companyId",
          "company_id"
        );
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "LeaveType",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("Schedule").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn(
          "Schedule",
          "companyId",
          "company_id"
        );
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "Schedule",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface.describeTable("User").then(async attributes => {
      if (attributes.companyId) {
        await queryInterface.renameColumn("User", "companyId", "company_id");
      }

      if (attributes.DepartmentId) {
        await queryInterface.renameColumn(
          "User",
          "DepartmentId",
          "department_id"
        );
      }
    });

    await queryInterface
      .describeTable("UserAllowanceAdjustment")
      .then(async attributes => {
        if (attributes.companyId) {
          await queryInterface.renameColumn(
            "UserAllowanceAdjustment",
            "companyId",
            "company_id"
          );
        }

        if (attributes.DepartmentId) {
          await queryInterface.renameColumn(
            "UserAllowanceAdjustment",
            "DepartmentId",
            "department_id"
          );
        }
      });
  },

  down: function(queryInterface, Sequelize) {
    // No way back!
    return Promise.resolve();
  }
};

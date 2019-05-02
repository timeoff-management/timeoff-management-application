"use strict";

module.exports = function(sequelize, DataTypes) {
  var DepartmentSupervisor = sequelize.define(
    "DepartmentSupervisor",
    {},
    {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        {
          fields: ["department_id"]
        },
        {
          fields: ["user_id"]
        }
      ]
    }
  );

  DepartmentSupervisor.associate = function(models) {
    DepartmentSupervisor.belongsTo(models.Department, {
      as: "department",
      foreignKey: "department_id"
    });

    DepartmentSupervisor.belongsTo(models.User, {
      as: "user",
      foreignKey: "user_id"
    });
  };

  return DepartmentSupervisor;
};

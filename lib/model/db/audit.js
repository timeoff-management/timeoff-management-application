"use strict";

module.exports = function (sequelize, DataTypes) {
  const Audit = sequelize.define(
    "Audit",
    {
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment:
          "Type of the entity which change is tracked. E.g. USER, LEAVE etc",
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "ID of the entity defined by entityType",
      },
      attribute: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Attribute of the entity which chnage is to be recorded",
      },
      oldValue: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Old value converted to STRING",
      },
      newValue: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "New value converted to STRING",
      },
    },
    {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: "at",
      updatedAt: false,
      tableName: "audit",

      classMethods: {
        associate: (models) => {
          Audit.belongsTo(models.Company, {
            as: "company",
            foreignKey: "companyId",
          });

          Audit.belongsTo(models.User, {
            as: "byUser",
            foreignKey: "byUserId",
          });
        },
      },
    }
  );

  return Audit;
};

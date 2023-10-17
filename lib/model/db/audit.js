"use strict";

module.exports = function(sequelize, DataTypes) {
  const Audit = sequelize.define(
    "Audit",
    {
      entity_type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment:
          "Type of the entity which change is tracked. E.g. USER, LEAVE etc"
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "ID of the entity defined by entityType"
      },
      attribute: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Attribute of the entity which chnage is to be recorded"
      },
      old_value: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Old value converted to STRING"
      },
      new_value: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "New value converted to STRING"
      }
    },
    {
      // underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: "at",
      updatedAt: false,
      tableName: "audit"
    }
  );

  Audit.associate = models => {
    Audit.belongsTo(models.Company, {
      as: "company",
      foreignKey: "company_id"
    });

    Audit.belongsTo(models.User, {
      as: "byUser",
      foreignKey: "by_user_id"
    });
  };

  return Audit;
};

"use strict";

module.exports = function (sequelize, DataTypes) {
  var Team = sequelize.define(
    "Team",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          fields: ["id"],
        },
      ],
    }
  );
  return Team;
};

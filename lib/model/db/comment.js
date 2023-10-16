"use strict";

module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Type of entity current comments belongs to",
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Reference ID for entity current comment belongs to",
      },
      comment: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "The value of comment",
      },
    },
    {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: "at",
      updatedAt: false,
      tableName: "comment",
    }
  );

  Object.assign(Comment, {
    associate: (models) => {
      Comment.belongsTo(models.Company, {
        as: "company",
        foreignKey: "companyId",
      });

      Comment.belongsTo(models.User, {
        as: "byUser",
        foreignKey: "byUserId",
      });
    },
    getEntityTypeLeave: () => "LEAVE",
  });

  return Comment;
};

'use strict'

module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    'Comment',
    {
      entity_type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Type of entity current comments belongs to'
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Reference ID for entity current comment belongs to'
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'The value of comment'
      }
    },
    {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'at',
      updatedAt: false,
      tableName: 'comments'
    }
  )

  Comment.associate = models => {
    Comment.belongsTo(models.Company, {
      as: 'company',
      foreignKey: { name: 'company_id', allowNull: false }
    })

    Comment.belongsTo(models.User, {
      as: 'byUser',
      foreignKey: { name: 'by_user_id', allowNull: false }
    })
  }

  Comment.getEntityTypeLeave = () => 'LEAVE'

  return Comment
}

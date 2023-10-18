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
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The value of comment'
      }
    },
    {
      // underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'at',
      updatedAt: false,
      tableName: 'comment'
    }
  )

  Comment.associate = models => {
    Comment.belongsTo(models.Company, {
      as: 'company',
      foreignKey: 'company_id'
    })

    Comment.belongsTo(models.User, {
      as: 'byUser',
      foreignKey: 'by_user_id'
    })
  }

  Comment.getEntityTypeLeave = () => 'LEAVE'

  return Comment
}

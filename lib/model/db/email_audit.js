
"use strict";

var Bluebird = require('bluebird'),
    moment   = require("moment");

module.exports = function(sequelize, DataTypes){
  var EmailAudit = sequelize.define("EmailAudit", {
    email : {
      type      : DataTypes.STRING,
      allowNull : false,
    },
    subject : {
      type      : DataTypes.TEXT,
      allowNull : false,
    },
    body : {
      type      : DataTypes.TEXT,
      allowNull : false,
    },
  },{
    underscored     : true,
    freezeTableName : true,
    timestamps      : true,
    createdAt       : 'created_at',
    updatedAt       : false,
    indexes : [{
      fields : [ 'created_at' ],
    },{
      fields : [ 'user_id' ],
    }],

    classMethods : {
      associate : function(models) {

        EmailAudit.belongsTo(models.Company, {
          as         : 'company',
          foreignKey : 'company_id',
        });


        EmailAudit.belongsTo(models.User, {
          as         : 'user',
          foreignKey : 'user_id',
        });
      },
    },

    instanceMethods : { },

  });

  return EmailAudit;
};

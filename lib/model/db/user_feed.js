"use strict";


module.exports = function(sequelize, DataTypes) {
  var UserFeed = sequelize.define("UserFeed", {
    name : {
      type : DataTypes.STRING,
      allowNull : false,
    },
    feed_token : {
      type      : DataTypes.STRING,
      allowNull : false,
    },
    type : {
      type      : DataTypes.ENUM('calendar', 'wallchart', 'company'),
      allowNull : false,
    },
  }, {

    classMethods: {
      associate : function( models ) {
        UserFeed.belongsTo(models.User, {as : 'user', foreignKey : 'id'});
      },

    },

    instanceMethods : {
    },
  });

  return UserFeed;
};

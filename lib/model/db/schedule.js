
'use strict';

module.exports = function(sequelize, DataTypesy){

  var Schedule = sequelize.define("LeaveType", {
    monday : {
      type         : DataTypes.BOOLEAN,
      allowNull    : false,
      defaultValue : true,
    },
  },{

    underscored     : true,
    freezeTableName : true,
    tableName       : 'schedule',

    classMethods: {
      associate : function( models ) {
        LeaveType.belongsTo(models.Company, {as : 'company'});
        LeaveType.hasMany(models.Leave, {as : 'leaves', foreignKey : 'leaveTypeId'});
      },
    },

    instanceMethods : {},
  });

  return Schedule;
};

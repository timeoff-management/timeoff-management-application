"use strict";

module.exports = function(sequelize, DataTypes) {
    var Leave = sequelize.define("Leave", {
        // TODO add validators!
        'status' : {
            type      : DataTypes.INTEGER,
            allowNull : false
        },
        employee_comment : {
            type      : DataTypes.STRING,
            allowNull : true,
        },
        approver_comment : {
            type      : DataTypes.STRING,
            allowNull : true,
        },
        decided_at : {
            type      : DataTypes.DATE,
            allowNull : true,
        },
    }, {

        classMethods : {
            associate : function( models ){
                Leave.belongsTo(models.User, { as : 'user',foreignKey     : 'id' });
                Leave.belongsTo(models.User, { as : 'approver',foreignKey : 'id' });
                Leave.belongsTo(models.LeaveType, { as : 'leave_type' } );
                Leave.hasMany(models.LeaveDay,    { as : 'days'       } );
            }
        },

    });

    return Leave;
};

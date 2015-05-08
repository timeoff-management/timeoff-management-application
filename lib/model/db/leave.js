"use strict";

var Promise   = require("bluebird");

module.exports = function(sequelize, DataTypes) {
    var Leave = sequelize.define("Leave", {
        // TODO add validators!
        'status' : {
            type      : DataTypes.INTEGER,
            allowNull : false
        },
        start_date : {
            type         : DataTypes.DATE,
            allowNull    : false,
        },
        end_date : {
            type      : DataTypes.DATE,
            allowNull : false,
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
                Leave.belongsTo(models.User, { as : 'user' });
                Leave.belongsTo(models.LeaveType, { as : 'leave_type' });
                Leave.belongsTo(models.User, { as : 'approver' });
            }
        },

    });

    return Leave;
};

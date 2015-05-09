"use strict";

module.exports = function(sequelize, DataTypes) {
    var LeaveDay = sequelize.define("LeaveDay", {
        // TODO add validators!
        date : {
            type         : DataTypes.DATE,
            allowNull    : false,
        },
        day_part : {
            type      : DataTypes.INTEGER,
            allowNull : false,
        },
    }, {

        classMethods : {
            associate : function( models ){
                LeaveDay.belongsTo(models.Leave, {as : 'leave', foreignKey : 'id'});
            }
        },

    });

    return LeaveDay;
};

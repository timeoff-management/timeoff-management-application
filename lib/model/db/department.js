"use strict";

module.exports = function(sequelize, DataTypes) {
    var Department = sequelize.define("Department", {
        // TODO add validators!
        name : {
            type      : DataTypes.STRING,
            allowNull : false
        }
    }, {
        classMethods: {
            associate : function( models ) {
                Department.hasMany(models.User, {as : 'users'});
                Department.belongsTo(models.Company, {as : 'company'});
            }
        },

        instanceMethods : {

        }
    });

    return Department;
};

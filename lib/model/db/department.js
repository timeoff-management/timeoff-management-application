"use strict";

module.exports = function(sequelize, DataTypes) {
    var Department = sequelize.define("Department", {
        // TODO add validators!
        name : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        allowence : {
            type         : DataTypes.INTEGER,
            allowNull    : false,
            defaultValue : 20,
        },
        include_public_holidays : {
            type         : DataTypes.BOOLEAN,
            allowNull    : false,
            defaultValue : true,
        }
    }, {
        classMethods: {
            associate : function( models ) {
                // We have constrains OFF as to prevent ORM complaining about
                // cycle reference
                Department.belongsTo(models.User, {as : 'boss', constraints: false});
                Department.hasMany(models.User, {as : 'users'});
                Department.belongsTo(models.Company, {as : 'company'});
            }
        },

        instanceMethods : {

        }
    });

    return Department;
};

"use strict";


var Promise   = require("bluebird");

module.exports = function(sequelize, DataTypes) {
    var Company = sequelize.define("Company", {
        // TODO add validators!
        name : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        country : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        start_of_new_year : {
            type      : DataTypes.INTEGER,
            allowNull : false
        },
    }, {
        classMethods: {

            associate : function( models ) {
                Company.hasMany(models.Department, {
                    as         : 'departments',
                    foreignKey : 'companyId',
                });
            },

            // Create new company based on default values
            create_default_company : function(){

                // Add new company record
                return Company.create({
                    name              : 'New company',
                    country           : 'UK',
                    start_of_new_year : 1,
                })

                // When new company is created - add default departments to it
                .then(function(company){

                    return sequelize.models.Department
                    .create({
                        name      : 'Sales',
                        companyId : company.id,
                    })
                    .then(function(){

                        return Promise.resolve(company);
                    });
                });

            },
        },

        instanceMethods : {

        }
    });

    return Company;
};

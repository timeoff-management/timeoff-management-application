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
                Company.hasMany(models.User, {
                    as         : 'users',
                    foreignKey : 'companyId',
                });
                Company.hasMany(models.BankHoliday, {
                    as         : 'bank_holidays',
                    foreignKey : 'companyId',
                });
                Company.hasMany(models.LeaveType, {
                    as         : 'leave_types',
                    foreignKey : 'companyId',
                });
            },

            // Create new company based on default values
            create_default_company : function(args){

                // Add new company record
                return Company.create({
                    name              : args.name || 'New company',
                    country           : 'UK',
                    start_of_new_year : 1,
                })

                // When new company is created - add default departments to it
                .then(function(company){

                    return Promise.all([
                        sequelize.models.Department
                            .create({
                                name      : 'Sales',
                                companyId : company.id,
                            }),
                        sequelize.models.BankHoliday
                            .generate_bank_holidays({ company : company }),
                        sequelize.models.LeaveType
                            .generate_leave_types({ company : company })
                    ])
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

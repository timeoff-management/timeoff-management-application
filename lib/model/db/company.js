"use strict";

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
            create_default_country : function(){
                return Company.create({
                    name              : 'New company',
                    country           : 'UK',
                    start_of_new_year : 1,
                });
            },
        },

        instanceMethods : {

        }
    });

    return Company;
};

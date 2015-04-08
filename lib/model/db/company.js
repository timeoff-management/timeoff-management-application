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
        },

        instanceMethods : {

        }
    });

    return Company;
};

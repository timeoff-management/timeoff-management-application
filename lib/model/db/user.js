"use strict";

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define("User", {
        email : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        password : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        name : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        lastname : {
            type      : DataTypes.STRING,
            allowNull : false
        },
    }, {
        classMethods: {
        }
    });

    return User;
};

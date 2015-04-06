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
            register_new_user : function(user_attributes){

                // TODO add parameters validation

                // TODO make sure we hash the password before storing it to DB

                return this.create( user_attributes );
            }
        }
    });

    return User;
};

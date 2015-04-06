"use strict";

var crypto = require('crypto'),
    crypto_secret = 'sjDkdhal12_FjkshdaWjskh';

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define("User", {
        // TODO add validators!
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

            /* hashify_password( password_string ) : string
             *
             * For provided string return hashed string.
             *
             * */
            hashify_password : function( password ) {
                return crypto
                    .createHash('md5')
                    .update(password + crypto_secret)
                    .digest('hex');
            },

            find_by_email : function( email ) {

                // TODO validate email

                return this.find({ where : { email : email } });
            },

            register_new_user : function(attributes){

                // TODO add parameters validation

                // Make sure we hash the password before storing it to DB
                attributes.password = this.hashify_password(attributes.password);

                return this.create( attributes );
            }
        },

        instanceMethods : {
            is_my_password : function( password ) {
                return User.hashify_password( password ) === this.password;
            }
        }
    });

    return User;
};

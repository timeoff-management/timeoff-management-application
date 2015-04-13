"use strict";

var crypto = require('crypto'),
    crypto_secret = 'sjDkdhal12_FjkshdaWjskh',
    model = require('../db');

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
        activated : {
            type         : DataTypes.BOOLEAN,
            allowNull    : false,
            defaultValue : false,
            comment      : 'This flag means that user account was activated, e.g. login',
        },
        admin : {
            type         : DataTypes.BOOLEAN,
            allowNull    : false,
            defaultValue : false,
            comment      : 'Indicate if account can edit company wide settings',
        },
    }, {
        classMethods: {

            associate : function(models){
                User.belongsTo(models.Company, {as : 'company'});
            },


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

            /*
             * Create new admin user within new environmen - company etc
             * */
            register_new_admin_user : function(attributes){

                // TODO add parameters validation

                // Make sure we hash the password before storing it to DB
                attributes.password = this.hashify_password(attributes.password);


                return sequelize.models.Company
                    .create_default_company()
                    .then(function(company){

                        attributes.CompanyId = company.id;
                        attributes.admin     = true;

                        return User.create( attributes );
                    });
            }
        },

        instanceMethods : {
            is_my_password : function( password ) {
                return User.hashify_password( password ) === this.password;
            },

            /*
             * Activate user only when it is inactive.
             * Return promise that gets user's object.
             * */
            maybe_activate : function(){
              if ( ! this.activated ) {
                  this.activated = true;
              }
              return this.save();
            },

            is_admin : function() {
                return this.admin === true;
            }
        }
    });

    return User;
};

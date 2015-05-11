"use strict";

var
    crypto        = require('crypto'),
    crypto_secret = 'sjDkdhal12_FjkshdaWjskh',
    model         = require('../db'),
    _             = require('underscore'),
    Promise       = require("bluebird"),
    CalendarMonth = require('../calendar_month');

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
                User.belongsTo(models.Department, {as : 'department', foreignKey : 'DepartmentId'});
                User.hasMany(models.Leave, { as : 'my_leaves', foreignKey : 'UserId' });
                User.hasMany(models.Leave, { as : 'supervised_leaves', foreignKey : 'ApproverId' });
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
             * Create new admin user within new environment - company etc
             * */
            register_new_admin_user : function(attributes){

                // TODO add parameters validation

                // Make sure we hash the password before storing it to DB
                attributes.password = this.hashify_password(attributes.password);

                var new_departments, new_user;

                return sequelize.models.Company
                    .create_default_company()

                    // Make sure new user is going to be linked with a company
                    .then(function(company){

                        attributes.companyId = company.id;
                        attributes.admin     = true;

                        return company.getDepartments();
                    })

                    // Make sure new user is linked with department
                    .then(function(departments){

                        new_departments = departments;

                        attributes.DepartmentId = departments[0].id;

                        return User.create( attributes );
                    })

                    // Make sure new departments know who is their boss
                    .then(function(user){
                        new_user = user;

                        return Promise.all(_.map(new_departments, function(department){
                            department.bossId = user.id;
                            return department.save();
                        }));
                    })

                    // Return promise with newly created user
                    .then(function(){
                        return Promise.resolve(new_user);
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
            },

            full_name : function() {
                return this.name + ' ' + this.lastname;
            },

            /* Fetch company object associated with current user, the company object
             * includes all necessary associations for building user detail page
             * for user determined by user_id.
             * Returns promise that is resolved with company object as parameter
             */
            get_company_for_user_details : function(args){
                var user_id = args.user_id,
                    current_user = this;

                return this.getCompany({
                    include : [
                        {model : sequelize.models.User, as : 'users', where : { id : user_id }},
                        {
                            model : sequelize.models.Department,
                            as : 'departments',
                            include : {
                                model : sequelize.models.User,
                                as : 'boss',
                            }
                        }
                    ],
                    order : [
                        [{model : sequelize.models.Department, as : 'departments'}, sequelize.models.Department.default_order_field()]
                    ],
                })

                // Make sure that company got only one user associated with for
                // provided user_id
                .then(function(company){

                    if (!company || company.users.length !== 1) {
                        throw new Error(
                            'User '+current_user.id+' tried to edit user '+user_id
                                +' but they do not share a company'
                        );
                    }

                    return Promise.resolve(company);
                });
            },

            get_company_for_add_user : function() {
                var model = sequelize.models;

                return this.getCompany({
                    include : [
                        {model : model.Department, as : 'departments'}
                    ],
                    order : [
                        [{model : model.Department, as : 'departments'}, model.Department.default_order_field()]
                    ],
                });
            },

            promise_calendar : function() {

                var model = sequelize.models;
                var this_user = this;

                return Promise.join(
                    Promise.try(function(){
                        return this_user.getDepartment();
                    }),
                    Promise.try(function(){
                        return this_user.getCompany({
                            include:[
                                { model : model.BankHoliday, as : 'bank_holidays' },
                                { model : model.LeaveType, as : 'leave_types' },
                            ]
                        });
                    }),
                    function(department, company){
                        return Promise.resolve(
                            _.map([1,2,3,4,5,6,7,8,9,10,11,12],function(i){
                                return (new CalendarMonth(
                                    '2015-'+i+'-01',
                                    {
                                        bank_holidays :
                                            department.include_public_holidays
                                            ?  _.map(
                                                company.bank_holidays,
                                                function(day){return day.date}
                                            )
                                            : [],
                                    }
                                )).as_for_template();
                            })
                        );
                    }
                );

            }, // end of promise_calendar

            get_company_with_all_users : function(){
                return this.getCompany({
                    include : [
                        {
                            model : sequelize.models.User,
                            as    : 'users',
                        },
                    ],
                    order : [
                        [{ model : sequelize.models.User, as : 'users' }, 'lastname'],
                    ]
                 });
            },

            promise_users_I_can_manage : function(){

                // Check if current user is admin, then fetch all users form company
                if ( this.is_admin() ) {

                    return this.get_company_with_all_users()
                      .then(function(company){
                          return Promise.resolve( company.users );
                      });
                }

                // if current user has any departments under supervision then get
                // all users from those departments plus user himself

                // if it is ordinary user, just return it
            },
        }
    });

    return User;
};

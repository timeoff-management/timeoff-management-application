"use strict";

var
    crypto        = require('crypto'),
    model         = require('../db'),
    _             = require('underscore'),
    moment        = require('moment'),
    Promise       = require("bluebird"),
    config        = require('../../config'),

    // User mixins
    withCompanyAwareness = require('../mixin/user/company_aware'),
    withAbsenceAwareness = require('../mixin/user/absence_aware');


module.exports = function(sequelize, DataTypes) {

  var instance_methods = get_instance_methods(sequelize);

  withCompanyAwareness.call(instance_methods, sequelize);
  withAbsenceAwareness.call(instance_methods, sequelize);

  var class_methods = get_class_methods(sequelize);

  withAssociations.call(class_methods, sequelize);

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
      start_date : {
          type         : DataTypes.DATE,
          allowNull    : false,
          defaultValue : DataTypes.NOW,
          comment      : 'Date employee start to work for company',
      },
      end_date : {
          type         : DataTypes.DATE,
          allowNull    : true,
          defaultValue : null,
          comment      : 'Date emplyee stop working for company',
      },
      adjustment : {
          type         : DataTypes.INTEGER,
          allowNull    : false,
          defaultValue : 0,
          comment      : 'Adjustment to allowance in current year',
      },
  }, {
      indexes : [
        {
          fields : ['companyId'],
        },
        {
          fields : ['lastname'],
        },
      ],
      classMethods: class_methods,

      instanceMethods : instance_methods,
    });

    return User;
};


/*
 * Convinience method that returns an object with definition of User's instance methods.
 *
 * */
function get_instance_methods(sequelize) {

  return {

    is_my_password : function( password ) {
        return sequelize.models.User.hashify_password( password ) === this.password;
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

    promise_users_I_can_manage : function(){
        var this_user = this;

        // Check if current user is admin, then fetch all users form company
        if ( this_user.is_admin() ) {

            return this_user.get_company_with_all_users()
              .then(function(company){
                  return Promise.resolve( company.users );
              });
        }

        // If current user has any departments under supervision then get
        // all users from those departments plus user himself,
        // if no supervised users an array with only current user is returned
        return this_user.getSupervised_departments({
            include : [{
                model : sequelize.models.User,
                as    : 'users',
            }],
        })
        .then(function(departments){
            var users = _.flatten(
                _.map(
                    departments,
                    function(department){ return department.users; }
                )
             );

            // Make sure current user is considered as well
            users.push(this_user);

            // Remove duplicates
            users = _.uniq(
                users,
                function(user){ return user.id; }
            );

            // Order by last name
            users = _.sortBy(
                users,
                function(user){ return user.lastname; }
            );

            return users;
        });

    }, // promise_users_I_can_manage

    promise_superviser : function(){
        return this.getDepartment({
            include : [{
                model : sequelize.models.User,
                as    : 'boss',
            }]
        })
        .then(function(department){
            return Promise.resolve( department.boss );
        });
    },


    calculate_number_of_days_available_in_allowence : function(year){
      return this.calculate_total_number_of_days_n_allowence(year)
        - this.calculate_number_of_days_taken_from_allowence();
    },


    reload_with_leave_details : function(args){
      var year = args.year || moment();

      return this.Model.find({
        where : {
          id : this.id,
        },
        include : [
          // Following is needed to be able to calculate how many days were
          // taked from allowence
          {
            model   : sequelize.models.Leave,
            as      : 'my_leaves',
            where : {
              $or : {
                date_start : {
                  $between : [
                    moment().startOf('year').format('YYYY-MM-DD'),
                    moment().endOf('year').format('YYYY-MM-DD'),
                  ]
                },
                date_end : {
                  $between : [
                    moment().startOf('year').format('YYYY-MM-DD'),
                    moment().endOf('year').format('YYYY-MM-DD'),
                  ]
                }
              }
            },
            include : [{
                  model : sequelize.models.LeaveType,
                  as    : 'leave_type',
              },{
                  model   : sequelize.models.User,
                  as      : 'approver',
                  include : [{
                    model   : sequelize.models.Company,
                    as      : 'company',
                    include : [{
                      model : sequelize.models.BankHoliday,
                      as    : 'bank_holidays',
                    }],
                  }],
            }] // End of my_leaves include
          },{
            model : sequelize.models.Department,
            as    : 'department',
          }
        ],
      });
    },


    remove : function() {
      var self = this;

      // make sure I am not admin, otherwise throw an error
      if (self.is_admin()) {
        throw new Error('Cannot remove administrator user');
      }

      // make sure I am not supervisor, otherwise throw an error
      return self.getSupervised_departments()
        .then(function(departments){
          if (departments.length > 0){
            throw new Error("Cannot remove supervisor");
          }

          return self.getMy_leaves()
        })
        .then(function(leaves){
          // remove all leaves
          return Promise.all(
            _.map( leaves, function(leave){ return leave.destroy(); })
          );
        })

        // remove user record
        .then(function(){
          return self.destroy();
        })

    },

    get_reset_password_token : function(){
      var self = this;

      return new Buffer( self.email + ' ' + self.Model.hashify_password( self.password ) ).toString('base64');
    },
  };

};

function get_class_methods(sequelize) {
  return {


    /* hashify_password( password_string ) : string
     *
     * For provided string return hashed string.
     *
     * */
    hashify_password : function( password ) {
      return crypto
        .createHash('md5')
        .update(password + config.get('crypto_secret'))
        .digest('hex');
    },


    get_user_by_reset_password_token : function(token) {
      var self                  = this,
      unpacked_token            = new Buffer(token, 'base64').toString('ascii'),
      email_and_hashed_password = unpacked_token.split(/\s/);

      return self.find_by_email(email_and_hashed_password[0])
        .then(function(user){
          if (user && self.hashify_password(user.password) === email_and_hashed_password[1]) {
            return Promise.resolve(user);
          } else {
            return Promise.resolve();
          }
        })
    },

    find_by_email : function( email ) {

        // TODO validate email

        return this.find({ where : { email : email } });
    },

    find_by_id : function(id) {
      return this.find({ where : {id : id}});
    },

    /*
     * Create new admin user within new environment - company etc
     * */
    register_new_admin_user : function(attributes){

        // TODO add parameters validation

        // Make sure we hash the password before storing it to DB
        attributes.password = this.hashify_password(attributes.password);

        var new_departments,
            new_user,
            company_name = attributes.company_name;

        delete attributes.company_name;

        return sequelize.models.User.find_by_email( attributes.email )
          .then(function(existing_user){
            if (existing_user) {
              var error = new Error('Email is already used')
              error.show_to_user = true;
              throw error;
            }

            return sequelize.models.Company
              .create_default_company({ name : company_name });
          })

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

            return sequelize.models.User.create( attributes );
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
    },

  };
}; // END of class methods


// Mixin-like function that injects definition of User's associations into supplied object.
// (Define relations between User class and other entities in the domain).
//
function withAssociations() {

  this.associate = function(models){

    models.User.belongsTo(models.Company, {
      as : 'company',
    });
    models.User.belongsTo(models.Department, {
      as         : 'department',
      foreignKey : 'DepartmentId',
    });
    models.User.hasMany(models.Leave, {
      as         : 'my_leaves',
      foreignKey : 'userId',
    });
    models.User.hasMany(models.Leave, {
      as         : 'supervised_leaves',
      foreignKey : 'approverId',
    });
    models.User.hasMany(models.Department, {
      as         : 'supervised_departments',
      foreignKey : 'bossId',
      constraints: false,
    });
    models.User.hasMany(models.UserFeed, {
      as         : 'feeds',
      foreignKey : 'userId',
    });
  };
}

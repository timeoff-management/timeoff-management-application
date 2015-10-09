"use strict";

var
    crypto        = require('crypto'),
    crypto_secret = 'sjDkdhal12_FjkshdaWjskh',
    model         = require('../db'),
    _             = require('underscore'),
    moment        = require('moment'),
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
        classMethods: {

            associate : function(models){
                User.belongsTo(models.Company, {as : 'company'});
                User.belongsTo(models.Department, {as : 'department', foreignKey : 'DepartmentId'});
                User.hasMany(models.Leave, { as : 'my_leaves', foreignKey : 'userId' });
                User.hasMany(models.Leave, { as : 'supervised_leaves', foreignKey : 'approverId' });
                User.hasMany(models.Department, {
                    as         : 'supervised_departments',
                    foreignKey : 'bossId',
                    constraints: false,
                });

                User.hasMany(models.UserFeed, { as : 'feeds', foreignKey : 'userId' });
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

    var promise_new_user = sequelize.models.Company
        .create_default_company({ name : company_name })

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

    return sequelize.models.User.find_by_email( attributes.email )
      .then(function(existing_user){
        if (existing_user) {
          throw new Error('Email is already used')
        }

        return promise_new_user;
      });
},

}, // END of class methods


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
    var user_id      = args.user_id,
        year         = args.year || moment(),
        current_user = this;

    return this.getCompany({
        include : [
            {
              model : sequelize.models.User,
              as    : 'users',
              where : { id : user_id },
              include : [

                // Following is needed to be able to calculate how many days were
                // taked from allowence
                {
                  model   : sequelize.models.Leave,
                  as      : 'my_leaves',
                  include : [{
                        model    : sequelize.models.LeaveDay,
                        required : false,
                        as       : 'days',
                        where    : {
                            date : {
                                $between : [
                                    moment(year).startOf('year').format('YYYY-MM-DD'),
                                    moment(year).endOf('year').format('YYYY-MM-DD'),
                                ],
                             },
                        },
                    },{
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
            },{
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

promise_calendar : function(args) {
    var year      = args.year || moment(),
        model     = sequelize.models,
        this_user = this;

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
        Promise.try(function(){
            return this_user.getMy_leaves({
                where : { status : { $ne : sequelize.models.Leave.status_rejected()}},
                include : [{
                    model : model.LeaveDay,
                    as    : 'days',
                    where : {
                        date : {
                            $between : [
                                moment(year).startOf('year').format('YYYY-MM-DD'),
                                moment(year).endOf('year').format('YYYY-MM-DD'),
                            ],
                         },
                    },
                }],
            });
        }),
        function(department, company, leaves){


            var leave_days = _.flatten( _.map(leaves, function(leave){
                return _.map( leave.days, function(leave_day){
                    leave_day.leave = leave;
                    return leave_day;
                });
            }));

            return Promise.resolve(
                _.map([1,2,3,4,5,6,7,8,9,10,11,12],function(i){
                    return new CalendarMonth(
                        moment(year).format('YYYY')+'-'+i+'-01',
                        {
                            bank_holidays :
                                department.include_public_holidays
                                ?  _.map(
                                    company.bank_holidays,
                                    function(day){return day.date}
                                )
                                : [],
                            leave_days : leave_days,
                        }
                    );
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
            [{ model : sequelize.models.User, as : 'users' }, 'lastname']
        ]
     });
},

get_company_with_all_leave_types : function() {
    return this.getCompany({
        include : [{
            model : sequelize.models.LeaveType,
            as    : 'leave_types',
        }],
        order : [
            [
                { model : sequelize.models.LeaveType, as : 'leave_types' }, 'name'
            ]
        ]
    });
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

validate_overlapping : function(new_leave_attributes) {
    var this_user = this;

    return this_user.getMy_leaves({
        where : { status : { $ne : sequelize.models.Leave.status_rejected()}},
        include : [{
            model : sequelize.models.LeaveDay,
            as : 'days',
            where : {
                'date' : {
                    $between : [
                        new_leave_attributes.from_date,
                        moment(new_leave_attributes.to_date)
                            .add(1,'days').format('YYYY-MM-DD'),
                    ]
                }
            }
        }],
        order : [
            [
                {
                    model : sequelize.models.LeaveDay,
                    as : 'days'
                },
                'date'
            ]
        ],
    })

    .then(function(overlapping_leaves){

        // Check there are overlapping leaves
        if (overlapping_leaves.length === 0){
            return Promise.resolve(1);
        }

        var overlapping_leave = overlapping_leaves[0];

        if (overlapping_leave.fit_with_leave_request(
              new_leave_attributes
        )){
            return Promise.resolve(1);
        }

        // Otherwise it is overlapping!
        var error = new Error('Overlapping booking!');
        error.user_message = 'Overlapping booking!';
        throw error;

    });
}, // end of validate_overlapping

// Promise all leaves requested by current user, regardless
// their statuses
//
promise_my_leaves : function(args){

    var where_clause = {},
        year         = args.year || moment();

    if (args && args.filter_status) {
      where_clause = { status : args.filter_status };
    }

    return this.getMy_leaves({
        include : [{
            model : sequelize.models.LeaveDay,
            as    : 'days',
            where : {
                date : {
                    $between : [
                        moment(year).startOf('year').format('YYYY-MM-DD'),
                        moment(year).endOf('year').format('YYYY-MM-DD'),
                    ],
                 },
            },
        },{
            model : sequelize.models.LeaveType,
            as    : 'leave_type',
        },{
            model : sequelize.models.User,
            as    : 'approver',
            include : [{
              model : sequelize.models.Company,
              as : 'company',
              include : [{
                model : sequelize.models.BankHoliday,
                as : 'bank_holidays',
              }],
            }],
        }],
        where : where_clause,
        order : [[
            {model : sequelize.models.LeaveDay, as : 'days'},
            sequelize.models.LeaveDay.default_order_field()
        ]],
    });
},

// NOTE TODO consider removing this 3method as it is not used anywhere
promise_my_approved_leaves : function(args) {
    var year = args.year || moment();

    return this.promise_my_leaves({
        filter_status : sequelize.models.Leave.status_approved(),
        year          : year,
    });
},

// Promise leaves that are needed to be Approved/Rejected
//
promise_leaves_to_be_processed : function(){
    return this.getSupervised_leaves({
        include : [{
            model : sequelize.models.LeaveDay,
            as    : 'days',
        },{
            model : sequelize.models.LeaveType,
            as    : 'leave_type',
        },{
            model : sequelize.models.User,
            as    : 'user',
            include : [{
              model : sequelize.models.Company,
              as : 'company',
              include : [{
                model : sequelize.models.BankHoliday,
                as    : 'bank_holidays',
              }],
            },{
              model : sequelize.models.Department,
              as    : 'department',
            }],
        }],
        where : { status : [sequelize.models.Leave.status_new(), sequelize.models.Leave.status_pended_revoke()] },
        order : [[
            {model : sequelize.models.LeaveDay, as : 'days'},
            sequelize.models.LeaveDay.default_order_field()
        ]],
    });
}, // END of promise_leaves_to_be_processed


calculate_number_of_days_taken_from_allowence : function(){
  return _.reduce(
    _.map(
      _.filter(
        this.my_leaves,
        function (leave){ return leave.is_approved_leave() }
      ),
      function(leave){ return leave.get_deducted_days_number() }
    ),
    function(memo, num){ return memo + num },
    0
  ) || 0;
},

calculate_number_of_days_available_in_allowence : function(year){
  return this.calculate_total_number_of_days_n_allowence(year)
    - this.calculate_number_of_days_taken_from_allowence();
},


get_automatic_adjustment : function(args) {

  var now = (args && args.now) ? moment(args.now) : moment();

  if (
    now.year() !== moment(this.start_date).year()
    && ( ! this.end_date || moment(this.end_date).year() > now.year() )
  ){
      return 0;
  }

  var start_date = moment(this.start_date).year() === now.year()
    ? moment(this.start_date)
    : now.startOf('year'),
  end_date = this.end_date && moment(this.end_date).year() <= now.year()
    ? moment(this.end_date)
    : moment().endOf('year');

  return -1*(this.department.allowence - Math.round(
    this.department.allowence * end_date.diff(start_date, 'days') / 365
  ));
},

calculate_total_number_of_days_n_allowence : function(year) {

  // If optional paramater year was provided we need to calculate allowance
  // for that year, and if it is something other then current year,
  // adjustment should be made, return nominal setting from department
  if (year && year != moment().year()) {
    return this.department.allowence
  }

  // Get general allowence based on department
  return this.department.allowence
    + this.get_automatic_adjustment()
    // Adjust it based on current user
    + this.adjustment;
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
        include : [{
              model : sequelize.models.LeaveDay,
              as    : 'days',
              required : false,
              where : {
                  date : {
                      $between : [
                          moment(year).startOf('year').format('YYYY-MM-DD'),
                          moment(year).endOf('year').format('YYYY-MM-DD'),
                      ],
                   },
              },
          },{
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

promise_my_leaves_for_calendar : function(args){
  var year = args.year || moment();

  return this.getMy_leaves({
    where : { status : { $ne : sequelize.models.Leave.status_rejected()}},
    include : [{
      model : sequelize.models.LeaveDay,
      as    : 'days',
      where : {
        date : {
          $between : [
            moment(year).startOf('year').format('YYYY-MM-DD'),
            moment(year).endOf('year').format('YYYY-MM-DD'),
          ],
         },
      },
    }],
  }); // End of MyLeaves
},

remove : function() {
  var self = this;

  // make sure I am not admin, otherwise throw an error
  if (self.is_admin()) {
    throw new Error('Cannot remove administrator user');
  }

  // make sure I am not supervisor, otherwise throw an error
  self.getSupervised_departments()
    .then(function(departments){
      if (departments.length > 0){
        throw new Error("Cannot remove supervisor");
      }

      return self.getMy_leaves()
    })
    .then(function(leaves){

      // remove all days
      return Promise.all(
        _.map( leaves, function(leave){
          return sequelize.models.LeaveDay.destroy({
            where : {
              leaveId : leave.id
            }
          });
        })
      )

      // remove all leaves
      .then(function(){
        return Promise.all(
          _.map( leaves, function(leave){ return leave.destroy(); })
        );
      });

    })

    // remove user record
    .then(function(){
      return self.destroy();
    })

},

        } // End of instance methods
    });

    return User;
};

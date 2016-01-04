
"use strict";

var
    _       = require('underscore'),
    moment  = require('moment'),
    Promise = require("bluebird"),
    LeaveDay = require('../leave_day');

module.exports = function(sequelize, DataTypes) {
    var Leave = sequelize.define("Leave", {
        // TODO add validators!
        'status' : {
            type      : DataTypes.INTEGER,
            allowNull : false
        },
        employee_comment : {
            type      : DataTypes.STRING,
            allowNull : true,
        },
        approver_comment : {
            type      : DataTypes.STRING,
            allowNull : true,
        },
        decided_at : {
            type      : DataTypes.DATE,
            allowNull : true,
        },

        date_start : {
            type         : DataTypes.DATE,
            allowNull    : false,
            defaultValue : sequelize.NOW,
        },
        day_part_start : {
            type         : DataTypes.INTEGER,
            allowNull    : false,
            defaultValue : 1, // VPP TODO replace with constant value
        },
        date_end : {
            type         : DataTypes.DATE,
            allowNull    : false,
            defaultValue : sequelize.NOW,
        },
        day_part_end : {
            type         : DataTypes.INTEGER,
            allowNull    : false,
            defaultValue : 1, // VPP TODO replace with constant value
        },
    }, {

        indexes : [
          {
            fields : ['userId'],
          },
          {
            fields : ['leaveTypeId'],
          },
          {
            fields : ['approverid'],
          },
        ],
        classMethods : {
            associate : function( models ){
                Leave.belongsTo(models.User, { as : 'user',foreignKey     : 'userId' });
                Leave.belongsTo(models.User, { as : 'approver',foreignKey : 'approverId' });
                Leave.belongsTo(models.LeaveType, { as : 'leave_type' } );
            },

            status_new : function(){
                return 1;
            },

            status_approved : function(){
                return 2;
            },

            status_rejected : function() {
              return 3;
            },

            status_pended_revoke : function(){
              return 4;
            },


            leave_day_part_all : function(){
                return 1;
            },

            leave_day_part_morning : function(){
                return 2;
            },

            leave_day_part_afternoon : function(){
                return 3;
            },

            /*
             * Create new leave for provided parameters.
             * Returns promise that is resolved with newly created leave row
             * */
            create_new_leave : function(args){

                // Make sure all required data is provided
                _.each(
                    ['for_employee','of_type','with_parameters'],
                    function(property){
                        if (! _.has(args, property)) {
                            throw new Error('No mandatory '+property+' was provided');
                        }
                    }
                );

                var employee      = args.for_employee,
                leave_type        = args.of_type,
                valide_attributes = args.with_parameters;


                // Make sure that booking to be created is not going to ovelap with
                // any existing bookings
                return Promise.try(function(){
                    return employee.validate_overlapping(valide_attributes);
                })
                .then(function(){
                    return employee.promise_superviser();
                })

                .then(function(superviser){

                    var start_date = moment(valide_attributes.from_date),
                    end_date       = moment(valide_attributes.to_date);

                    // Check that start date is not bigger then end one
                    if ( start_date.toDate() > end_date.toDate() ) {
                        throw new Error('Start date is later than end date');
                    }

                    // Following statement creates in memory only leave object
                    // it is not in database until .save() method is called
                    var leave_to_create = sequelize.models.Leave.build({
                      userId           : employee.id,
                      leaveTypeId      : leave_type.id,
                      status           : Leave.status_new(),
                      approverId       : superviser.id,
                      employee_comment : valide_attributes.reason,

                      date_start     : start_date.format('YYYY-MM-DD'),
                      date_end       : end_date.format('YYYY-MM-DD'),
                      day_part_start : valide_attributes.from_date_part,
                      day_part_end   : valide_attributes.to_date_part,
                    });

                    // Next check that by adding new leave request user will not
                    // overflow his allowance
                    //
                    // Male sure object contain all necessary data for that check
                    return employee.reload_with_leave_details({
                      year : start_date.clone(),
                    })
                    .then(function(employee){
                      return employee.reload_with_session_details();
                    })
                    .then(function(employee){
                      return employee.company.reload_with_bank_holidays()
                        .then(function(){ return Promise.resolve(employee); });
                    })
                    .then(function(employee){

                      // Throw an exception when less than zero vacation would remain
                      // if we add currently requested absence
                      if (
                        employee.calculate_number_of_days_available_in_allowence(
                          start_date.format('YYYY')
                        )
                        -
                        leave_to_create.get_deducted_days_number({
                          year : start_date.format('YYYY'),
                          user : employee,
                          leave_type : leave_type,
                        })
                        <
                        0
                      ) {

                        var error = new Error('Requested absence is longer than remaining allowance');
                        error.user_message = error.toString();
                        throw error;
                      }

                      return leave_to_create.save();
                    })

                });
            }, // End of create_new_leave
        }, // End of class methods

        instanceMethods : {

get_days : function() {

  var self   = this,
  start_date = moment(this.date_start),
  end_date   = moment(this.date_end),
  days       = [ start_date ];

  if (self.hasOwnProperty('_days')) {
    return self._days;
  }

  if ( ! start_date.isSame( end_date, 'day') ){

      var days_in_between = end_date.diff( start_date, 'days' ) - 1;

      for (var i=1; i<=days_in_between; i++) {
          days.push( start_date.clone().add(i, 'days') );
      }

      days.push( end_date );
  }

  days = _.map(
      days,
      function(day){
          return new LeaveDay({
            sequelize : sequelize,
            date     : day.format('YYYY-MM-DD'),
            day_part : day.isSame(start_date, 'day')
              ? self.day_part_start
              : day.isSame(end_date, 'day')
              ? self.day_part_end
              : Leave.leave_day_part_all(),
          });
      }
  );

  return self._days = days;
},

fit_with_leave_request : function(leave_request) {

    // If start and end dates are the same, check if one of them fit
    // into fist or last leave_days.
    if (
        leave_request.is_within_one_day() && (
            leave_request.does_fit_with_leave_day( _.last(this.get_days()) )
            ||
            leave_request.does_fit_with_leave_day( _.first(this.get_days()) )
        )
      ) {
        return true;
    }

    // If start and end dates are different, check if start date
    // fits into end leave_day or end date fits int start leave_date.
    if (
        (! leave_request.is_within_one_day()) && (
            leave_request.does_fit_with_leave_day_at_start(
                 _.last(this.get_days())
            )
            ||
            leave_request.does_fit_with_leave_day_at_end(
                 _.first(this.get_days())
            )
        )
    ) {
        return true;
    }

    return false;
}, // End of fit_with_leave_request

is_new_leave : function() {
    return this.status === Leave.status_new();
},

is_pended_revoke_leave : function(){
  return this.status === Leave.status_pended_revoke();
},

// Leave is treated as "approved" one if it is in approved staus
// or if it is waiting decision on revoke action
//
is_approved_leave : function() {
  return this.status === Leave.status_approved() ||
    this.status === Leave.status_pended_revoke() ;
},

get_start_leave_day : function(){
    return this.get_days()[0];
},

get_end_leave_day : function(){
    return this.get_days()[ this.get_days().length - 1 ];
},

get_deducted_days_number : function(args) {
  var number_of_days = this.get_deducted_days(args).length;

  // leave spans via on working day only, pay attention only to the start date
  if (number_of_days === 1 && !this.get_start_leave_day().is_all_day_leave()) {
    number_of_days = number_of_days - 0.5;
  }

  // case when leave spreads for more then one day, then check if both start and day
  // are halfs
  else if (number_of_days > 1) {
    if ( ! this.get_start_leave_day().is_all_day_leave() ){
      number_of_days = number_of_days - 0.5;
    }
    if ( ! this.get_end_leave_day().is_all_day_leave() ) {
      number_of_days = number_of_days - 0.5;
    }
  }

  return number_of_days;
},

get_deducted_days : function(args) {

  var leave_days = [],
    ignore_allowance = false,
    leave_type = this.leave_type || args.leave_type,
    year;

  if (args && args.hasOwnProperty('ignore_allowance')) {
    ignore_allowance = args.ignore_allowance;
  }

  if (args && args.hasOwnProperty('year')) {
    year = moment(args.year, 'YYYY');
  }

  // If current Leave stands for type that does not use
  // allowance, ignore rest of the code;
  if (! ignore_allowance && !leave_type.use_allowance) return leave_days;

  var user = this.approver || this.user || args.user;

  var bank_holiday_map = {};

  user.company.bank_holidays.forEach(function(bank_holiday){
    bank_holiday_map[ bank_holiday.get_pretty_date() ] = 1;
  });

  leave_days = _.filter(
    _.map(this.get_days(), function(leave_day){

      // Ignore bank holidays
      if ( bank_holiday_map[ leave_day.get_pretty_date() ] ) return;

      // If it happenned that current leave day is from the year current
      // call was made of, ignore that day
      if (year && year.year() !== moment(leave_day.date).year()) return;

      // Ignore weekends
      //
      // Here 6 and 0 are moment's day() indexes for
      // weekend days
      if ( moment(leave_day.date).day() === 6
        || moment(leave_day.date).day() === 0
      ) return;

      return leave_day;
    }),
    function(leave_day){
      return !! leave_day;
    }
  ) || [];

  return leave_days;
}, // End get_deducted_days

promise_to_reject : function() {
  // See explanation to promise_to_approve
  this.status = this.is_pended_revoke_leave() ?
    Leave.status_approved():
    Leave.status_rejected();
  return this.save();
},

promise_to_approve : function() {
  // If current leave is one with requested revoke, then
  // approve action set it into Rejected status
  // otherwise it is approve action for new leave
  // so put leave into Approved
  this.status = this.is_pended_revoke_leave() ?
    Leave.status_rejected():
    Leave.status_approved();
  return this.save();
},

promise_to_revoke : function(){
  var self = this;

  return self.getUser({
      include : [
        {
          model : sequelize.models.Department,
          as    : 'department',
        }
      ],
    })
    .then(function(user){
      self.approverId = user.department.bossId;
      self.status = Leave.status_pended_revoke();

      return self.save();
    })
},

get_leave_type_name : function() {
  var leave_type = this.get('leave_type');

  if (! leave_type ) {
    return '';
  } else {
    return leave_type.name;
  }
},

        },
    });

    return Leave;
};

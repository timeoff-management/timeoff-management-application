
"use strict";

var
    _       = require('underscore'),
    moment  = require('moment'),
    Promise = require("bluebird");

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
                Leave.hasMany(models.LeaveDay,    { as : 'days'       } );
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

                    return sequelize.models.Leave.create({
                        userId           : employee.id,
                        leaveTypeId      : leave_type.id,
                        status           : Leave.status_new(),
                        approverId       : superviser.id,
                        employee_comment : valide_attributes.reason,
                    });
                })
                .then(function(leave){

                    var leave_request_attributes = _.clone(
                        valide_attributes
                    );
                    leave_request_attributes.leave = leave;

                    return Promise.try(function(){
                        return sequelize.models.LeaveDay.bulkCreate(
                            sequelize.models.LeaveDay.get_objects_for_bulk_create(
                                leave_request_attributes
                            )
                        );
                    })
                    .then(function(){
                        return Promise.resolve(leave);
                    });

                });
            }, // End of create_new_leave
        }, // End of class methods

        instanceMethods : {

fit_with_leave_request : function(leave_request) {

    // If start and end dates are the same, check if one of them fit
    // into fist or last leave_days.
    if (
        leave_request.is_within_one_day() && (
            leave_request.does_fit_with_leave_day( _.last(this.days) )
            ||
            leave_request.does_fit_with_leave_day( _.first(this.days) )
        )
      ) {
        return true;
    }

    // If start and end dates are different, check if start date
    // fits into end leave_day or end date fits int start leave_date.
    if (
        (! leave_request.is_within_one_day()) && (
            leave_request.does_fit_with_leave_day_at_start(
                 _.last(this.days)
            )
            ||
            leave_request.does_fit_with_leave_day_at_end(
                 _.first(this.days)
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
    return this.get('days')[0];
},

get_end_leave_day : function(){
    return this.get('days')[ this.get('days').length - 1 ];
},

get_deducted_days_number : function() {
  var number_of_days = this.get_deducted_days().length;

  // Take into consideration of non full day parts
  if ( number_of_days > 0
    && (
      !this.get_start_leave_day().is_all_day_leave()
      || !this.get_end_leave_day().is_all_day_leave()
    )
  ) {
    number_of_days = number_of_days - 0.5;
  }

  return number_of_days;
},

get_deducted_days : function() {

  var leave_days = [];

  // If current Leave stands for type that does not use
  // allowance, ignore rest of the code;
  if (!this.leave_type.use_allowance) return leave_days;

  var user = this.approver || this.user;

  var bank_holiday_map = {};

  user.company.bank_holidays.forEach(function(bank_holiday){
    bank_holiday_map[ bank_holiday.get_pretty_date() ] = 1;
  });

  leave_days = _.filter(
    _.map(this.days, function(leave_day){

      // Ignore bank holidays
      if ( bank_holiday_map[ leave_day.get_pretty_date() ] ) return;

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
  this.status = Leave.status_pended_revoke();
  return this.save();
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

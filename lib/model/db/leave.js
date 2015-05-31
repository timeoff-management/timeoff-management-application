
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

        classMethods : {
            associate : function( models ){
                Leave.belongsTo(models.User, { as : 'user',foreignKey     : 'id' });
                Leave.belongsTo(models.User, { as : 'approver',foreignKey : 'id' });
                Leave.belongsTo(models.LeaveType, { as : 'leave_type' } );
                Leave.hasMany(models.LeaveDay,    { as : 'days'       } );
            },

            status_new : function(){
                return 1;
            },

            status_approved : function(){
                return 2;
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
                        UserId           : employee.id,
                        leaveTypeId      : leave_type.id,
                        status           : Leave.status_new(),
                        ApproverId       : superviser.id,
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

is_pended_leave : function() {
    return this.status === Leave.status_new();
},

is_approved_leave : function() {
    return this.status === Leave.status_approved();
},

get_nice_created_at : function() {
    return moment(this.createdAt).format('YYYY-MM-DD');
},

        },
    });

    return Leave;
};

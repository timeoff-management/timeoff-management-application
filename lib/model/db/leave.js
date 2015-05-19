
"use strict";

var
    _       = require('underscore'),
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
                        status           : 1, // TODO remove magic number
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
        },

    });

    return Leave;
};

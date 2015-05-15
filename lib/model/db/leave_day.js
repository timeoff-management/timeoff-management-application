"use strict";

var
    _       = require('underscore'),
    moment  = require('moment');

module.exports = function(sequelize, DataTypes) {
    var LeaveDay = sequelize.define("LeaveDay", {
        // TODO add validators!
        date : {
            type         : DataTypes.DATE,
            allowNull    : false,
        },
        day_part : {
            type      : DataTypes.INTEGER,
            allowNull : false,
        },
    }, {

        classMethods : {
            associate : function( models ){
                LeaveDay.belongsTo(models.Leave, {as : 'leave', foreignKey : 'id'});
            },

            get_objects_for_bulk_create : function(args) {

                // Make sure all required data is provided
                _.each(
                    ['from_date','to_date','from_date_part', 'to_date_part','leave'],
                    function(property){
                        if (! _.has(args, property)) {
                            throw new Error('No mandatory '+property+' was provided');
                        }
                    }
                );

                var start_date = moment(args.from_date),
                end_date       = moment(args.to_date),
                leave          = args.leave;

                // Check that start date is not bigger then end one
                if ( start_date.toDate() > end_date.toDate() ) {
                    throw new Error('Start date is later than end date');
                }

                var days = [ start_date ];

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
                        return {
                            date     : day.format('YYYY-MM-DD'),
                            day_part : day.isSame(start_date, 'day')
                                ? args.from_date_part
                                : day.isSame(end_date, 'day')
                                ? args.to_date_part
                                : 1,
                            LeaveId  : leave.id
                        };
                    }
                );

                return days;
            }, // get_objects_for_bulk_create
        },

    });

    return LeaveDay;
};

"use strict";

var
    _       = require('underscore'),
    moment  = require('moment');

module.exports = function(sequelize, DataTypes) {
    var LeaveDay = sequelize.define("XXX", {
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

//        indexes : [
//          {
//            fields : ['LeaveId'],
//          }
//        ],
//        classMethods : {
//            associate : function( models ){
//                LeaveDay.belongsTo(models.Leave, {as : 'leave', foreignKey : 'id'});
//            },
//
//            leave_day_part_all : function(){
//                return 1;
//            },
//
//            leave_day_part_morning : function(){
//                return 2;
//            },
//
//            leave_day_part_afternoon : function(){
//                return 3;
//            },
//
//            default_order_field : function(){ return 'id'; },
//
//            get_objects_for_bulk_create : function(args) {
//
//                // Make sure all required data is provided
//                _.each(
//                    ['from_date','to_date','from_date_part', 'to_date_part','leave'],
//                    function(property){
//                        if (! _.has(args, property)) {
//                            throw new Error('No mandatory '+property+' was provided');
//                        }
//                    }
//                );
//
//                var start_date = moment(args.from_date),
//                end_date       = moment(args.to_date),
//                leave          = args.leave;
//
//                // Check that start date is not bigger then end one
//                if ( start_date.toDate() > end_date.toDate() ) {
//                    throw new Error('Start date is later than end date');
//                }
//
//                var days = [ start_date ];
//
//                if ( ! start_date.isSame( end_date, 'day') ){
//
//                    var days_in_between = end_date.diff( start_date, 'days' ) - 1;
//
//                    for (var i=1; i<=days_in_between; i++) {
//                        days.push( start_date.clone().add(i, 'days') );
//                    }
//
//                    days.push( end_date );
//                }
//
//                days = _.map(
//                    days,
//                    function(day){
//                        return {
//                            date     : day.format('YYYY-MM-DD'),
//                            day_part : day.isSame(start_date, 'day')
//                                ? args.from_date_part
//                                : day.isSame(end_date, 'day')
//                                ? args.to_date_part
//                                : LeaveDay.leave_day_part_all(),
//                            LeaveId  : leave.id
//                        };
//                    }
//                );
//
//                return days;
//            }, // get_objects_for_bulk_create
//        }, // end of classMethods
//
//        instanceMethods : {
//            is_all_day_leave : function(){
//                return this.day_part === LeaveDay.leave_day_part_all();
//            },
//            is_morning_leave : function(){
//                return this.day_part === LeaveDay.leave_day_part_morning();
//            },
//            is_afternoon_leave : function(){
//                return this.day_part === LeaveDay.leave_day_part_afternoon();
//            },
//            // Set current object to be as one for All day leave, but the state is not
//            // saved into database. It is used when showing calendar to user and
//            // there are two half days that fit into one whole day
//            pretend_to_be_full_day : function() {
//                return this.day_part = LeaveDay.leave_day_part_all();
//            },
//
//            get_pretty_date : function(){
//              return moment(this.date).format('YYYY-MM-DD');
//            },
//        }

    });

    return LeaveDay;
};

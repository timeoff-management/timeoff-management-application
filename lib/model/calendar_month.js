
'use strict';

var moment = require('moment'),
    _      = require('underscore');

function CalendarMonth(day, args){
    var me = this;
    this.date           = moment(day).startOf('month');
    this._leaves        = {};
    this._bank_holidays = {};

    if (args && args.bank_holidays){
        var map = {};
        args.bank_holidays.forEach(function(day){
            day = moment(day);
            map[day.format(me.default_date_format())] = 1;
        });
        this._bank_holidays = map;
    }

    if (args && args.leave_days){
        var map = {};
        args.leave_days.forEach(function(day){
            var attribute = moment(day.date).format(me.default_date_format());
            if ( ! map[attribute] ) {
                map[attribute] = day;
            } else if ( map[attribute] ) {

                if (map[attribute].is_all_day_leave()) {
                    return;
                }

                if (day.is_all_day_leave()){
                    map[attribute] = day;
                } else if ( map[attribute].day_part !== day.day_part ) {
                    map[attribute].pretend_to_be_full_day();
                }
            }
        });
        this._leaves = map;
    }
};

CalendarMonth.prototype.is_bank_holiday = function(day) {
    return this._bank_holidays && this._bank_holidays[
        this.get_base_date().date(day).format(this.default_date_format())
    ];
};

CalendarMonth.prototype.is_leave = function(day) {
    var leave_day = this._leaves[
        this.get_base_date().date(day).format(this.default_date_format())
    ];

    return leave_day && leave_day.is_all_day_leave();
};

CalendarMonth.prototype.is_leave_morning = function(day) {
    var leave_day = this._leaves[
        this.get_base_date().date(day).format(this.default_date_format())
    ];
    return this.is_leave(day)
        || (leave_day && leave_day.is_morning_leave());
};

CalendarMonth.prototype.is_leave_afternoon = function(day) {
    var leave_day = this._leaves[
        this.get_base_date().date(day).format(this.default_date_format())
    ];

    return this.is_leave(day)
        || (leave_day && leave_day.is_afternoon_leave());
};

CalendarMonth.prototype.is_new_leave = function(day){
    var leave_day = this._leaves[
        this.get_base_date().date(day).format(this.default_date_format())
    ];

    return leave_day && leave_day.leave && leave_day.leave.is_new_leave();
};

CalendarMonth.prototype.is_approved_leave = function(day){
    var leave_day = this._leaves[
        this.get_base_date().date(day).format(this.default_date_format())
    ];

    return leave_day && leave_day.leave && leave_day.leave.is_approved_leave();
};

CalendarMonth.prototype.default_date_format = function(){
    return 'YYYY-MM-DD';
};

CalendarMonth.prototype.how_many_days = function() {
    return this.date.daysInMonth();
};

CalendarMonth.prototype.get_base_date = function(){
    return this.date.clone();
};

CalendarMonth.prototype._week_day_map = function(){
    return { 0:7, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 };
};

CalendarMonth.prototype.week_day = function(){
    return this._week_day_map()[ this.date.day() ];
};

CalendarMonth.prototype.how_many_blanks_at_the_start = function(){
    return this.week_day() - 1;
};

CalendarMonth.prototype.how_many_blanks_at_the_end = function(){
    return 7 - this._week_day_map()[ this.get_base_date().endOf('month').day() ];
};

CalendarMonth.prototype.is_weekend = function(day){
    var index = this._week_day_map()[ this.get_base_date().date(day).day() ];

    // Here 6 and 7 are indexes in our custom data structure,
    // it has nothing to do with moment's day() indexes.
    return index === 6 || index === 7;
};

CalendarMonth.prototype.as_for_template = function(){
    var weeks = [];
    var week = [];

    for( var i=0; i<this.how_many_blanks_at_the_start(); i++){
        week.push({val:''});
    }

    for( var i=1; i<=this.how_many_days(); i++){
        var day = {val:i};

        if ( this.is_weekend(i) ) {
            day.is_weekend = true;
        } else if ( this.is_bank_holiday(i) ){
            day.is_bank_holiday = true;
        } else {
            if ( this.is_leave_morning(i) ) {
                day.is_leave_morning = true;
            }
            if ( this.is_leave_afternoon(i) ) {
                day.is_leave_afternoon = true;
            }

            if ( this.is_new_leave(i) ) {
                day.is_new_leave = true;
            } else if ( this.is_approved_leave(i) ) {
                day.is_approved_leave = true;
            }
        }

        week.push(day);
        if (week.length >= 7) {
            weeks.push( week );
            week = [];
        }
    }

    for( var i=0; i<this.how_many_blanks_at_the_end(); i++){
        week.push({val:''});
    }

    weeks.push(week);

    return {
        month : this.get_base_date().format('MMMM'),
        moment: this.get_base_date(),
        weeks : weeks,
    };
};

CalendarMonth.prototype.as_for_team_view = function(){
  var me = this,
    for_calendar_structure = this.as_for_template();

  // remove empty days, those staying for empty cells in calendar
  var days = _.filter(
    _.flatten(for_calendar_structure.weeks),
    function(day){
      return !! day.val
    }
  );

  _.each(days, function(day){
    day.moment = me.get_base_date().date(day.val);
  });

  return days;

};

module.exports = CalendarMonth;

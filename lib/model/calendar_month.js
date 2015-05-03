
'use strict';

var moment = require('moment');

function CalendarMonth(day){
    this.date = moment(day).startOf('month');
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

CalendarMonth.prototype.as_for_template = function(){
    var weeks = [];
    var week = [];

    for( var i=0; i<this.how_many_blanks_at_the_start(); i++){
        week.push('');
    }

    for( var i=1; i<=this.how_many_days(); i++){
        week.push(i);
        if (week.length >= 7) {
            weeks.push( week );
            week = [];
        }
    }

    for( var i=0; i<this.how_many_blanks_at_the_end(); i++){
        week.push('');
    }

    weeks.push(week);
 
    return {
        month : this.get_base_date().format('MMMM'),
        weeks : weeks,
    };
};

module.exports = CalendarMonth; 

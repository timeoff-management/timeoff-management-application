
'use strict';

var moment = require('moment'),
    _      = require('underscore');

function CalendarMonth(day, args){
    var self = this;
    this.date           = moment.utc(day).startOf('month');
    this._leaves        = {};
    this._bank_holidays = {};


    if (args && args.today) {
      self.today = args.today;
    } else {
      throw new Error('CalendarMonth requires today - moment object that represents today');
    }

    if (args){
      self._schedule = args.schedule;
    }

    if ( ! self._schedule ) {
      throw new Error('CalendarMonth requires schedule');
    }

    if (args && args.bank_holidays){
        var map = {};
        args.bank_holidays.forEach(function(day){
            day = moment.utc(day);
            map[day.format(self.default_date_format())] = day;
        });
        self._bank_holidays = map;
    }

    if (args && args.leave_days){
        var map = {};
        args.leave_days.forEach(function(day){
            var attribute = moment.utc(day.date).format(self.default_date_format());
            if ( ! map[attribute] ) {
                map[attribute] = day;
            } else if ( map[attribute] ) {

                if (map[attribute].is_all_day_leave()) {
                    return;
                }

                if (day.is_all_day_leave()){
                    map[attribute] = day;
                } else if ( map[attribute].day_part !== day.day_part ) {

                  // Merge leave types from both days into one in "map"
                  if (day.is_morning_leave()) {
                    map[attribute].morning_leave_type_id = day.morning_leave_type_id;
                  }

                  if ( day.is_afternoon_leave() ) {
                    map[attribute].afternoon_leave_type_id = day.afternoon_leave_type_id;
                  }

                  map[attribute].pretend_to_be_full_day();
                }
            }
        });
        self._leaves = map;
    }

    self._leave_types_map = {};

    if (args && args.leave_types) {
      // Build leave types look up dictionary
      args.leave_types.forEach(lt => self._leave_types_map[ lt.id ] = lt);
    }

  return;
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

CalendarMonth.prototype.get_leave_obj = function(day){
  var leave_day = this._leaves[
    this.get_base_date().date(day).format(this.default_date_format())
  ];

  if (leave_day && leave_day.leave) {
    return leave_day.leave;
  } else {
    return null;
  }
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

CalendarMonth.prototype.get_morning_leave_type_id = function(day){
  let
    self = this,
    leave_day = self._leaves[
      self.get_base_date().date(day).format(self.default_date_format())
    ];

  if ( ! leave_day ) {
    return null;
  }

  return leave_day.get_morning_leave_type_id();
};

CalendarMonth.prototype.get_afternoon_leave_type_id = function(day){
  let
    self = this,
    leave_day = self._leaves[
      self.get_base_date().date(day).format(self.default_date_format())
    ];

  if ( ! leave_day ) {
    return null;
  }

  return leave_day.get_afternoon_leave_type_id();
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
  return ! this._schedule.is_it_working_day({
    day : this.get_base_date().date(day),
  });
};

CalendarMonth.prototype.is_current_day = function(day){
  return this.get_base_date().date(day).format( this.default_date_format() )
    ===
  this.today.format( this.default_date_format() );
};

CalendarMonth.prototype.as_for_template = function(){
    let
      self = this,
      weeks = [],
      week = [];

    for( var i=0; i<self.how_many_blanks_at_the_start(); i++){
        week.push({val:''});
    }

    for( var i=1; i<=self.how_many_days(); i++){
        var day = {
          val       : i,
          leave_obj : self.get_leave_obj(i),
        };

        if ( self.is_weekend(i) ) {
            day.is_weekend = true;
        } else if ( self.is_bank_holiday(i) ){
            day.is_bank_holiday = true;
        } else {
            if ( self.is_leave_morning(i) ) {
              day.is_leave_morning = true;

              let morning_leave_type_id = self.get_morning_leave_type_id(i);
              day.morning_leave_type_id = morning_leave_type_id;

              day.leave_color_class_morning = morning_leave_type_id && self._leave_types_map[ morning_leave_type_id ]
                ? self._leave_types_map[ morning_leave_type_id ].get_color_class()
                : 'leave_type_color_1';
            }

            if ( self.is_leave_afternoon(i) ) {
              day.is_leave_afternoon = true;

              let afternoon_leave_type_id = self.get_afternoon_leave_type_id(i);
              day.afternoon_leave_type_id = afternoon_leave_type_id;

              day.leave_color_class_afternoon = afternoon_leave_type_id && self._leave_types_map[ afternoon_leave_type_id ]
                ? self._leave_types_map[ afternoon_leave_type_id ].get_color_class()
                : 'leave_type_color_1';
            }

            if ( self.is_new_leave(i) ) {
                day.is_new_leave = true;
            } else if ( self.is_approved_leave(i) ) {
                day.is_approved_leave = true;
            }
        }

        if ( self.is_current_day(i) ) {
          day.is_current_day = true;
        }

        week.push(day);
        if (week.length >= 7) {
            weeks.push( week );
            week = [];
        }
    }

    for( var i=0; i<self.how_many_blanks_at_the_end(); i++){
        week.push({val:''});
    }

    weeks.push(week);

    return {
        month : self.get_base_date().format('MMMM'),
        moment: self.get_base_date(),
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

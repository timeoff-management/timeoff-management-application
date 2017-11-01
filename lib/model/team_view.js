
'use strict';

var moment = require('moment'),
Promise    = require('bluebird'),
_          = require('underscore');

function TeamView(args) {
  var me = this;

  this.base_date = args.base_date || moment();
  this.user = args.user;
}

// This function calculates approved leaves for given user and adds object leave_summary to users_and_leaves items
function calculate_user_approved_leave_summary(userSummary, leave_summary, bank_holidays, schedule, date) {

  userSummary.leave_days.forEach(function (leave_day) {

    if (leave_day.leave.is_approved_leave() && schedule.is_it_working_day({day: moment(leave_day.date)})
      && !bank_holidays[leave_day.get_pretty_date()] && moment(leave_day.date).month() === moment(date).month()) {

      // TODO: Fix this to Leave.leave_day_part_all , not sure how to get it
      if (leave_day.day_part === 1) {
          leave_summary[leave_day.leave.leaveTypeId] += 1;
      } else {
          leave_summary[leave_day.leave.leaveTypeId] += 0.5;
      }
    }
  });

    userSummary.leave_summary = leave_summary;
}

TeamView.prototype.promise_team_view_details = function(args){

  // Handle case when no parameters were provided
  if ( ! args ) {
    args = {};
  }

  var user = this.user,
      current_department_id = args.department_id, // optional parameter
      related_departments = [],
      current_department,
      base_date = this.base_date;

  var promise_departments;

  var normalise_departments_func = function(my_department, supervised_departments){

    if (my_department) {
      // Get all related departments by combining supervised ones with
      // one current user belongs to
      supervised_departments.push(my_department);
    }
    supervised_departments = _.uniq(supervised_departments, function(item){ return item.id });

    // Copy all available departments for current user into closured variable
    // to pass it into template
    related_departments = _.sortBy(supervised_departments, 'name');

    // Find out what particular department is active now
    if (current_department_id) {
      current_department = _.findWhere(supervised_departments, { id : Number(current_department_id) });
    }

    return Promise.resolve(current_department ? [current_department] : supervised_departments);
  }

  if (user.is_admin() || user.company.share_all_absences) {

    // For admin users or if current company allows all users to see everybody's
    // time offs promise all departments for current company
    promise_departments = user.company.getDepartments()
      .then(function(departments){
        return normalise_departments_func(null, departments);
      });

  } else {
    // Promise departments either supervised by current user or one that she belongs to
    promise_departments = Promise.join(
      user.getDepartment(),
      user.getSupervised_departments(),
      normalise_departments_func
    );
  }

  // Calculate users and leaves for every department
  var promise_users_and_leaves = promise_departments.map(function(department){
    return department.promise_team_view({ base_date : base_date });
  });

  return user.get_company_for_export().then(function(company){

    var bank_holiday_map = {},
        schedule = user.cached_schedule,
        leave_summary = {};

    // We want to filter bank holidays from counter
    company.bank_holidays.forEach(function(bank_holiday){
      bank_holiday_map[ bank_holiday.get_pretty_date() ] = 1;
    });

    // Initialize the summary for the leave types
    company.leave_types.forEach(function(leave_type){
      leave_summary[leave_type.id] = 0;
    });

    return promise_users_and_leaves.then(function(users_and_leaves){

      users_and_leaves = _.sortBy(
        _.flatten(users_and_leaves),
        function(item){ return item.user.lastname + item.user.name; }
      );

      users_and_leaves.forEach(function (item) {
        calculate_user_approved_leave_summary(item, _.clone(leave_summary), bank_holiday_map, schedule, base_date);
      });

      return Promise.resolve({
          users_and_leaves    : users_and_leaves,
          related_departments : related_departments,
          current_department  : current_department,
      });
    });
  });



};

module.exports = TeamView;

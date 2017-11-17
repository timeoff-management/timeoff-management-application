
'use strict';

const
  moment  = require('moment'),
  Promise = require('bluebird'),
  Joi     = require('joi'),
  _       = require('underscore');

function TeamView(args) {
  var me = this;

  this.base_date = args.base_date || moment();
  this.user = args.user;
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
      user.promise_supervised_departments(),
      normalise_departments_func
    );
  }

  // Calculate users and leaves for every department
  var promise_users_and_leaves = promise_departments.map(function(department){
    return department.promise_team_view({ base_date : base_date });
  });

  return promise_users_and_leaves.then(function(users_and_leaves){

    users_and_leaves = _.sortBy(
      _.flatten(users_and_leaves),
      function(item){ return item.user.lastname + item.user.name; }
    );

    return Promise.resolve({
      users_and_leaves    : users_and_leaves,
      related_departments : related_departments,
      current_department  : current_department,
    });
  });

};

// Experimenting with parameter validation done with Joi.js
const inject_statistics_args_schema = Joi.object()
  .keys({
    leave_types : Joi.array().items(
      Joi.object().keys({
        id            : Joi.number().required(),
        use_allowance : Joi.boolean().required(),
      })
    ),
    team_view_details : Joi.object().required().keys({
      users_and_leaves : Joi.array().required().items(
        Joi.object().keys()
      )
    }),
  });

/*
 * Takes "team view details" and enrich them with statistics about absences
 * each employee has for given month
 *
 * */

TeamView.prototype.inject_statistics = function(args){

  // Validate parameters
  let param_validation = Joi.validate(args, inject_statistics_args_schema, { allowUnknown : true });
  if (param_validation.error) {
    console.log('An error occured when trying to validate args in inject_statistics.');
    console.dir(param_validation.error);
    throw new Error('Failed to validate parameters in TeamView.inject_statistics');
  }

  let
    team_view_details = args.team_view_details,
    leave_types = args.leave_types || [];

  // Convert leave types array into look-up map
  let leave_types_map = {};
  leave_types.forEach( lt => leave_types_map[lt.id] = lt );


  team_view_details
    .users_and_leaves
    .forEach(node => {

      let deducted_days = 0;

      node
        .days
        // Consider only those days that have any leave objects
        .filter( day => !! day.leave_obj )
        // Ignore those days which were not approved yet
        .filter( day => !! day.leave_obj.is_approved_leave() )
        // Ignore weekends
        .filter( day => ! day.is_weekend )
        // Ignore bank holidays
        .filter( day => ! day.is_bank_holiday )
        .forEach( day => {
          let leave_type = leave_types_map[  day.leave_obj.leaveTypeId ];

          if (! (leave_type && leave_type.use_allowance)) {
            return;
          }

          if (day.is_leave_afternoon && day.is_leave_morning){
            deducted_days++;
          } else {
            deducted_days = deducted_days + 0.5;
          }
        });

      let statistics = {
        deducted_days : deducted_days,
      };

      node.statistics = statistics;
    });

  return Promise.resolve( team_view_details );
};

/*
 *  Take "team view details" and user for whom them were generated
 *  and ensure the details contain statisticts for only those employees
 *  current user has access to.
 *
 * */

TeamView.prototype.restrainStatisticsForUser = function(args){

  // TODO Consider parameters validation in the same fashion as in inject_statistics method

  let
    team_view_details = args.team_view_details,
    observer_user     = args.user;

  let supervised_user_map = {};
  observer_user.supervised_users.forEach( u => supervised_user_map[ u.id ] = u);

  team_view_details
    .users_and_leaves
    .forEach(item => {
      if (item.statistics && ! supervised_user_map[ item.user.id ]) {
        delete item.statistics;
      }
    });

  return Promise.resolve( team_view_details );
};

module.exports = TeamView;

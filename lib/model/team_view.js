
'use strict';

var moment = require('moment'),
Promise    = require('bluebird'),
_          = require('underscore');

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

  if (user.is_admin()) {

    // For admin users primise all departments for current company
    promise_departments = user.getCompany()
      .then(function(company){ return company.getDepartments() })
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

module.exports = TeamView;

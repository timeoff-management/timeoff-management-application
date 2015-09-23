
'use strict';

var moment = require('moment'),
Promise    = require('bluebird'),
_          = require('underscore');

function Wallchart(args) {
  var me = this;

  this.base_date = args.base_date || moment();
  this.user = args.user;
}

Wallchart.prototype.promise_wallchart_details = function(args){
  var user = this.user,
      current_department_id = args.department_id, // optional parameter
      related_departments = [],
      current_department,
      base_date = this.base_date;

  // Promise departments either supervised by current user or one that she belongs to
  var promise_departments = Promise.join(
    user.getDepartment(),
    user.getSupervised_departments(),
    function(my_department, supervised_departments){

      // Get all related departments by combining supervised ones with
      // one current user belongs to
      supervised_departments.push(my_department);
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
  );

  // Calculate users and leaves for every department
  var promise_users_and_leaves = promise_departments.map(function(department){
    return department.promise_wall_chart({ base_date : base_date });
  });

  return promise_users_and_leaves.then(function(users_and_leaves){
    return Promise.resolve({
      users_and_leaves    : users_and_leaves,
      related_departments : related_departments,
      current_department  : current_department,
    });
  });

};

module.exports = Wallchart;

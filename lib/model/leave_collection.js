
"use strict";

var
  Promise = require('bluebird'),
  moment  = require('moment'),
  _       = require('underscore'),
  config  = require('../config');

function promise_to_group_leaves(leaves) {

  if ( ! leaves ) {
    throw new Error('Did not get "leaves" in promise_to_group_leaves');
  }

  let grouped_leaves = {};

  // Group leaves by years
  leaves.forEach(leave => {
    let year = moment(leave.get_start_leave_day().date).format('YYYY');

    if ( ! grouped_leaves[year]) {
      grouped_leaves[ year ] = {
        year : year,
        leaves : [],
      };
    }

    grouped_leaves[ year ].leaves.push(leave);
  });

  // Sort year groups
  grouped_leaves = _
    .values( grouped_leaves )
    .sort((a,b) => a.year > b.year ? -1 : a.year < b.year ? 1 : 0);

  // Calculate total allowance deduction per group
  grouped_leaves.forEach(group => {
    group.total_deduction = _.reduce(
      group.leaves.map(leave => leave.get_deducted_days_number()),
      (memo, number) => memo + number,
      0
    );
  });

  return Promise.resolve(grouped_leaves);
}

/*
 * Simple function that sorts array of Leave objects in default way.
 *
 * */

function promise_to_sort_leaves(leaves) {
  return Promise.resolve( leaves.sort(
    (a,b) => a.date_start > b.date_start
      ? -1 : a.date_start < b.date_start
      ? 1 : 0
  ));
}

module.exports = function(){
  return {
    promise_to_group_leaves : promise_to_group_leaves,
    promise_to_sort_leaves : promise_to_sort_leaves,
  };
};

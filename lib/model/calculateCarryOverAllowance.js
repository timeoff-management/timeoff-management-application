
'use strict';

const
  moment = require('moment'),
  Promise= require('bluebird');

const calculateCarryOverAllowance = ({users}) => {

  const
    yearFrom = moment.utc().add(-1, 'y').year(),
    yearTo = moment.utc().year();

  console.log(`${yearFrom} -> ${yearTo}`);

  let flow = Promise.resolve(users);

  flow = flow.then(users => Promise.map(
    users,
    user => {
      let carryOver;
      return Promise.resolve(user.getCompany().then(c => carryOver = c.carry_over))
        .then(() => user.reload_with_leave_details({year:moment.utc(yearFrom, 'YYYY')}))
        .then(user => user.promise_allowance({year:moment.utc(yearFrom, 'YYYY')}))
        .then(allowance => {
          return user.promise_to_update_carried_over_allowance({
            year                   : yearTo,
            carried_over_allowance : Math.min(allowance.number_of_days_available_in_allowance, carryOver),
          });
        })
        .then(() => console.log(`Done with user ${user.id}`));
    },
    {concurrency : 1}
  ));

  return flow;
};

module.exports = { calculateCarryOverAllowance };


"use strict"

const
  Promise= require('bluebird'),
  Joi    = require('joi'),
  moment = require('moment'),
  Models = require('../db');

const
  schemaCreateNewLeave = Joi.object().required().keys({
    for_employee    : Joi.object().required(),
    of_type         : Joi.object().required(),
    with_parameters : Joi.object().required(),
  });

/*
 * Create new leave for provided parameters.
 * Returns promise that is resolved with newly created leave row
 * */
function createNewLeave(args){

  args = Joi.attempt(
    args,
    schemaCreateNewLeave,
    "Failed to validate arguments"
  );

  const
    employee          = args.for_employee,
    leave_type        = args.of_type,
    valide_attributes = args.with_parameters;


  // Make sure that booking to be created is not going to ovelap with
  // any existing bookings
  return Promise

    .try(() => employee.validate_overlapping(valide_attributes))
    .then(() => employee.promise_boss())
    .then(main_supervisor => {

     const
        start_date = moment.utc(valide_attributes.from_date),
        end_date   = moment.utc(valide_attributes.to_date);

      // Check that start date is not bigger then end one
      if ( start_date.toDate() > end_date.toDate() ) {
        throw new Error('Start date is later than end date');
      }

      const new_leave_status = employee.is_auto_approve()
        ? Models.Leave.status_approved()
        : Models.Leave.status_new();

      // Following statement creates in memory only leave object
      // it is not in database until .save() method is called
      const leave_to_create = Models.Leave.build({
        userId           : employee.id,
        leaveTypeId      : leave_type.id,
        status           : new_leave_status,
        approverId       : main_supervisor.id,
        employee_comment : valide_attributes.reason,

        date_start     : start_date.format('YYYY-MM-DD'),
        date_end       : end_date.format('YYYY-MM-DD'),
        day_part_start : valide_attributes.from_date_part,
        day_part_end   : valide_attributes.to_date_part,
      });

      return employee
        .validate_leave_fits_into_remaining_allowance({
          year       : start_date,
          leave_type : leave_type,
          leave      : leave_to_create,
        })
        .then(() => leave_to_create.save());

    });
}

module.exports = {
  createNewLeave : createNewLeave,
}

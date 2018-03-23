
"use strict";

const
  moment = require('moment'),
  Joi    = require('joi');

const

  schema_user = Joi
    .object()
    .required()
    .options({ allowUnknown : true })
    .keys({
      promise_total_number_of_days_in_allowance : Joi.func().required(),
    }),

  schema_year = Joi
    .object()
    .type(moment)
    .default(() => moment.utc(), 'Default year is current one'),

  schema_promise_allowance = Joi.object().required().keys({
    year : schema_year,
    user : schema_user,
  }),

  scheme_constructor = Joi.object().required().keys({
    year : schema_year,
    user : schema_user,
    total_number_of_days_in_allowance     : Joi.number().required(),
    number_of_days_available_in_allowance : Joi.number().required(),
  });


class UserAllowance {

  constructor(args) {

    args = Joi.attempt(
      args,
      scheme_constructor,
      'Failed parameters validation for UserAllowance constructor'
    );

    let self = this;


    self._user = args.user;

    self._total_number_of_days_in_allowance = args.total_number_of_days_in_allowance;
    Object.defineProperty(self, 'total_number_of_days_in_allowance', {
      get : () => self._total_number_of_days_in_allowance,
    });

    self._number_of_days_available_in_allowance = args.number_of_days_available_in_allowance;
    Object.defineProperty(self, 'number_of_days_available_in_allowance', {
      get : () => self._number_of_days_available_in_allowance,
    });
  }


  /*
   *  The idea of this static method is to be constructor for UserAllowance class.
   *  It takes parameters and perform all necessary (and costly) actions to fetch
   *  all info required for allowance calculation for given user and year.
   * */
  static promise_allowance(args) {

    args = Joi.attempt(
      args,
      schema_promise_allowance,
      'Failed to validate parameters for promise_allowance'
    );

    let
      user = args.user,
      year = args.year,
      number_of_days_available_in_allowance,
      total_number_of_days_in_allowance;

    return Promise

      // We code below relies on user to have my_leaves fetched onto it, so do it if needed
      .resolve(
        user.my_leaves === undefined
        ? user.reload_with_leave_details({ year : year })
        : 1
      )

      // Fetch total number of days in employees allowance
      .then(() => user.promise_total_number_of_days_in_allowance(year))
      .then(num => Promise.resolve( total_number_of_days_in_allowance = num))

      .then(() => user.promise_number_of_days_available_in_allowance(year.format('YYYY')))
      .then(num => Promise.resolve( number_of_days_available_in_allowance = num ))


      // Got all necessary data for UserAllowance object so build it!
      .then(() => {

        return new UserAllowance({
          user : user,
          year : year,

          total_number_of_days_in_allowance     : total_number_of_days_in_allowance,
          number_of_days_available_in_allowance : number_of_days_available_in_allowance,
        });
      })


  }

}


module.exports = UserAllowance;


"use strict";

const
  moment = require('moment'),
  Promise= require('bluebird'),
  Joi    = require('joi');

const

  schema_user = Joi
    .object()
    .required(),
//    .options({ allowUnknown : true })
//    .keys({
//      promise_total_number_of_days_in_allowance : Joi.func().required(),
//    }),

  schema_year = Joi
    .object()
    .type(moment)
    .default(() => moment.utc(), 'Default year is current one'),

  schema_now = Joi
    .object()
    .type(moment)
    .default(context => context.user.company.get_today(), 'Derive today from corresponding company'),

  schema_promise_allowance = Joi.object().required().keys({
    year : schema_year,
    user : schema_user,
    now  : schema_now,
  }),

  scheme_constructor = Joi.object().required().keys({
    year : schema_year,
    user : schema_user,

    number_of_days_taken_from_allowance   : Joi.number().required(),
    manual_adjustment : Joi.number().required(),
    carry_over        : Joi.number().required(),
    nominal_allowance : Joi.number().required(),
    now : schema_now, // TODO now needs to replace year parameter (year should just be derived from now)
  });


class UserAllowance {

  constructor(args) {

    // Validate provided parameters
    args = Joi.attempt(
      args,
      scheme_constructor,
      'Failed parameters validation for UserAllowance constructor'
    );

    let self = this,
      now = args.now;

    // Private properties (not to be accessed directly)
    self._user                                = args.user;
    self._number_of_days_taken_from_allowance = args.number_of_days_taken_from_allowance;
    self._manual_adjustment                   = args.manual_adjustment;
    self._carry_over                          = args.carry_over;
    self._nominal_allowance                   = args.nominal_allowance;

    Object.defineProperty(self, 'total_number_of_days_in_allowance', {
      get : () => {
        return self.nominal_allowance + self.carry_over + self.manual_adjustment + self.employement_range_adjustment;
      },
    });


    Object.defineProperty(self, 'number_of_days_taken_from_allowance', {
      get : () => self._number_of_days_taken_from_allowance,
    });

    Object.defineProperty(self, 'manual_adjustment', {
      get : () => self._manual_adjustment,
    });

    Object.defineProperty(self, 'carry_over', {
      get : () => self._carry_over,
    });

    Object.defineProperty(self, 'nominal_allowance', {
      get : () => self._nominal_allowance,
    });


    Object.defineProperty(self, 'number_of_days_available_in_allowance', {
      get : () => self.total_number_of_days_in_allowance - self.number_of_days_taken_from_allowance,
    });

    Object.defineProperty(self, 'user', {
      get : () => self._user,
    });

    Object.defineProperty(self, 'employement_range_adjustment', {
      get : () => {

        if (
          now.year() !== moment.utc(self.user.start_date).year()
          && ( ! self.user.end_date || moment.utc(self.user.end_date).year() > now.year() )
        ){
          return 0;
        }

        let start_date = moment.utc(self.user.start_date).year() === now.year()
          ? moment.utc(self.user.start_date)
          : now.startOf('year'),
        end_date = self.user.end_date && moment.utc(self.user.end_date).year() <= now.year()
          ? moment.utc(self.user.end_date)
          : moment.utc().endOf('year');

        return -1*(self.nominal_allowance - Math.round(
          self.nominal_allowance * end_date.diff(start_date, 'days') / 365
        ));
      }
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
      number_of_days_taken_from_allowance,
      manual_adjustment,
      carried_over_allowance,
      total_number_of_days_in_allowance;

    return Promise

      // We code below relies on user to have my_leaves fetched onto it, so do it if needed
      .resolve(
        user.my_leaves === undefined ? user.reload_with_leave_details({ year : year }) : 1
      )

      // Fetch adjustment and Carry over allowance
      .then(() => user.promise_adjustment_and_carry_over_for_year(year))
      .then(adjustment_and_coa => {
        manual_adjustment      = adjustment_and_coa.adjustment;
        carried_over_allowance = adjustment_and_coa.carried_over_allowance;
        return Promise.resolve();
      })


      .then(() => Promise.resolve( number_of_days_taken_from_allowance = user.calculate_number_of_days_taken_from_allowance({ year : year.format('YYYY') }) ))

      // Got all necessary data for UserAllowance object so build it!
      .then(() => {

        return new UserAllowance({
          user : user,
          year : year,

          number_of_days_taken_from_allowance : number_of_days_taken_from_allowance,
          manual_adjustment                   : manual_adjustment,
          carry_over                          : carried_over_allowance,
          nominal_allowance                   : user.department.allowance,
        });
      });

  }

}

module.exports = UserAllowance;

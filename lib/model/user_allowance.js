
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
      .then(() => promise_total_number_of_days_in_allowance.call(user, year))
      .then(num => Promise.resolve( total_number_of_days_in_allowance = num))

      .then(() => promise_number_of_days_available_in_allowance.call(user, year.format('YYYY')))
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





/*
 * THis function used to be a method on user object.
 *
 *
 *
 * Calculate number of days available in allowance for current employee.
 *
 * */
function promise_number_of_days_available_in_allowance(year) {
  let self = this;

  if ( ! year ){
    year = moment.utc().format('YYYY');
  }

  // To avoid redundant trips to DB check cached value first
  if ( self.tom_cach &&
    self.tom_cach.hasOwnProperty('number_of_days_available_in_allowance') &&
    self.tom_cach.number_of_days_available_in_allowance.hasOwnProperty( year )
  ) {
    return Promise.resolve(
      self.tom_cach.number_of_days_available_in_allowance[year]
    );
  }

  return promise_total_number_of_days_in_allowance.call(self, year)

    .then(total_days_number => total_days_number - self.calculate_number_of_days_taken_from_allowance({year : year}))

    .then(number_of_days => {

      // Cach calculated value
      if ( ! self.hasOwnProperty('tom_cach') ) {
        self.tom_cach = {};
      }

      if ( ! self.tom_cach.hasOwnProperty('number_of_days_available_in_allowance')) {
        self.tom_cach.number_of_days_available_in_allowance = {};
      }

      self.tom_cach.number_of_days_available_in_allowance[year] = number_of_days;

      return Promise.resolve( number_of_days );
    });
}

function promise_total_number_of_days_in_allowance(year){
  let self = this;

  return Promise

    // First ensure that all necessary properties are available
    .try(() => {
      if ( ! self.department) {
        return self.getDepartment()
          .then(department => {
            self.department = department;
            return Promise.resolve();
          })
      }

      return Promise.resolve();
    })

    // Fetch Adjustment and Carried over allowance for current year
    .then(() => self.promise_adjustment_and_carry_over_for_year(year))

    .then(adjustment_and_coa => Promise.resolve(
      self._calculate_total_number_of_days_n_allowance({
        year       : year,
        adjustment : adjustment_and_coa.adjustment,
        carried_over_allowance : adjustment_and_coa.carried_over_allowance,
      })
    ));
};



module.exports = UserAllowance;

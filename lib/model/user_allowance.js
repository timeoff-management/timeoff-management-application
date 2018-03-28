
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

    number_of_days_taken_from_allowance   : Joi.number().required(),
    manual_adjustment : Joi.number().required(),
    carry_over        : Joi.number().required(),
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
    self._total_number_of_days_in_allowance     = args.total_number_of_days_in_allowance;
    self._number_of_days_taken_from_allowance   = args.number_of_days_taken_from_allowance;
    self._manual_adjustment = args.manual_adjustment;
    self._carry_over        = args.carry_over;

    Object.defineProperty(self, 'total_number_of_days_in_allowance', {
      get : () => self._total_number_of_days_in_allowance,
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




    Object.defineProperty(self, 'number_of_days_available_in_allowance', {
      get : () => self.total_number_of_days_in_allowance - self.number_of_days_taken_from_allowance,
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

      .join(
        // We code below relies on user to have my_leaves fetched onto it, so do it if needed
        Promise.resolve(
          user.my_leaves === undefined
          ? user.reload_with_leave_details({ year : year })
          : 1
        ),
        // Ensure that all necessary properties are available
        Promise.resolve(
          user.department === undefined
            ? user.getDepartment().then(dep => Promise.resolve(user.department = dep))
            : 1
        ),
        () => {
          return Promise.resolve();
      })

      // Fetch adjustment and Carry over allowance
      .then(() => user.promise_adjustment_and_carry_over_for_year(year))
      .then(adjustment_and_coa => {
        manual_adjustment      = adjustment_and_coa.adjustment;
        carried_over_allowance = adjustment_and_coa.carried_over_allowance;
        return Promise.resolve();
      })

      // Fetch total number of days in employees allowance
      .then(() => Promise.resolve(
        _calculate_total_number_of_days_n_allowance.call(user, {
          year       : year,
          adjustment : manual_adjustment,
          carried_over_allowance : carried_over_allowance,
        })
      ))
      .then(num => Promise.resolve( total_number_of_days_in_allowance = num))

      .then(() => Promise.resolve( number_of_days_taken_from_allowance = user.calculate_number_of_days_taken_from_allowance({ year : year.format('YYYY') }) ))

      // Got all necessary data for UserAllowance object so build it!
      .then(() => {

        return new UserAllowance({
          user : user,
          year : year,

          total_number_of_days_in_allowance   : total_number_of_days_in_allowance,
          number_of_days_taken_from_allowance : number_of_days_taken_from_allowance,
          manual_adjustment                   : manual_adjustment,
          carry_over                          : carried_over_allowance,
        });
      });


  }

}



function _calculate_total_number_of_days_n_allowance(args) {
  let
    self       = this,
    year       = args.year,
    adjustment = args.adjustment,
    carried_over_allowance = args.carried_over_allowance;

  // If optional paramater year was provided we need to calculate allowance
  // for that year, and if it is something other then current year,
  // we use department nominal allowance plus employee's allowance
  // (ignoreing automatic allowance)
  if (year && moment.utc(year).year() != moment.utc().year()) {
    return self.department.allowance
      + carried_over_allowance
      + adjustment;
  }

  // Get general allowance based on department
  return self.department.allowance
    + get_automatic_adjustment.call(self)
    + carried_over_allowance
    + adjustment;
};



function get_automatic_adjustment(args) {

  var now = (args && args.now) ? moment.utc(args.now) : this.company.get_today();

  if (
    now.year() !== moment.utc(this.start_date).year()
    && ( ! this.end_date || moment.utc(this.end_date).year() > now.year() )
  ){
    return 0;
  }

  var start_date = moment.utc(this.start_date).year() === now.year()
    ? moment.utc(this.start_date)
    : now.startOf('year'),
  end_date = this.end_date && moment.utc(this.end_date).year() <= now.year()
    ? moment.utc(this.end_date)
    : moment.utc().endOf('year');

  return -1*(this.department.allowance - Math.round(
    this.department.allowance * end_date.diff(start_date, 'days') / 365
  ));
};


module.exports = UserAllowance;


/*
 *  This class represent Employee's allowance.
 *
 *  As allowance became quite complicated entity, which is calculated
 *  based on few sources, there was decision to move allowance calculation
 *  logic out into its own class.
 *
 * */

"use strict";

const
  moment = require('moment'),
  Promise= require('bluebird'),
  Joi    = require('joi');

/*
 *  Section where we declare interfaces used in methods for this class.
 * */

const

  schema_user = Joi
    .object()
    .required(),

  schema_year = Joi
    .object()
    .type(moment)
    // Consider removing defaults
    .default(() => moment.utc(), 'Default year is current one'),

  schema_now = Joi
    .object()
    .type(moment)
    // Consider removing defaults
    // Note on this line: once it used to derive now from user's company
    // get_now() method, but Joi.js has high penalty on defaults which
    // use function with 'context' so I have removed it.
    // Yes it is less precise but much more faster code.
    .default(() => moment.utc(), 'Default is UTC one not from company specific'),

  schema_promise_allowance = Joi.object().required().keys({
    year : schema_year,
    user : schema_user,
    now  : schema_now,
   holiday_year_start_month : Joi.number().default(-1),
    /**
     * If TRUE now is not going to be changed.
     */
    forceNow: Joi.boolean().default(false),
  }),

  scheme_constructor = Joi.object().required().keys({
    user : schema_user,

    number_of_days_taken_from_allowance   : Joi.number().required(),
    manual_adjustment : Joi.number().required(),
    carry_over        : Joi.number().required(),
    nominal_allowance : Joi.number().required(),
    now : schema_now,
  });

/*
 *  Class definition.
 *
 * */

class UserAllowance {

  constructor(args) {

    // Validate provided parameters
    args = Joi.attempt(
      args,
      scheme_constructor,
      'Failed parameters validation for UserAllowance constructor'
    );

    const self = this;

    // Private properties (not to be accessed directly)
    self._user                                = args.user;
    self._number_of_days_taken_from_allowance = args.number_of_days_taken_from_allowance;
    self._manual_adjustment                   = args.manual_adjustment;
    self._carry_over                          = args.carry_over;
    self._nominal_allowance                   = args.nominal_allowance;
    self._now                                 = args.now;
  }

  get total_number_of_days_in_allowance() {
    const self = this;

    return (self.nominal_allowance +
      self.carry_over +
      self.manual_adjustment +
      self.employement_range_adjustment);
  }

  get number_of_days_taken_from_allowance() {
    return this._number_of_days_taken_from_allowance;
  }

  get manual_adjustment() {
    return this._manual_adjustment;
  }

  get carry_over() {
    return this._carry_over;
  }

  get nominal_allowance() {
    return this._nominal_allowance;
  }

  get number_of_days_available_in_allowance() {
    const self = this;

    // Check case when user started after "now", then even so she has
    // nominal allowance derived from general settings, she could not
    // use it as it is valid for time she was not here
    if (self.user.start_date &&
      moment.utc(self.user.start_date).year() > self._now.year()
    ) {
      return 0;
    }

    return (
      self.total_number_of_days_in_allowance
      - self.number_of_days_taken_from_allowance
      + (self.is_accrued_allowance ? self.accrued_adjustment : 0)
    );
  }

  get is_accrued_allowance() {
    return !! this.user.department.is_accrued_allowance;
  }

  get user() {
    return this._user;
  }

  get employement_range_adjustment() {
    let
      self = this,
      now  = self._now.clone();

    if (
      now.year() !== moment.utc(self.user.start_date).year()
      && ( ! self.user.end_date || moment.utc(self.user.end_date).year() > now.year() )
    ){
      return 0;
    }

    let start_date = moment.utc(self.user.start_date).year() === now.year()
      ? moment.utc(self.user.start_date)
      : now.clone().startOf('year'),
    end_date = self.user.end_date && moment.utc(self.user.end_date).year() <= now.year()
      ? moment.utc(self.user.end_date)
      : now.clone().endOf('year');

    return -1*(self.nominal_allowance - Math.round(
      self.nominal_allowance * end_date.diff(start_date, 'days') / 365
    ));
  }

  /*
   *  Accrued adjustment affects all total allowance components BUT carried
   *  over part. Because "carry over" part was already deserved.
   *
   * */
  get accrued_adjustment() {
    const
      self = this,
      now  = self._now.clone();

    // Consider only following parts of allowance when calculating accrual
    // adjustment:
    //  * nominal allowance
    //  * manual adjustment
    //  * adjustment based in start/end day of employment
    // Other components do not make sense, e.g.:
    //  * carried over part - it could be immediately used as employee
    //    already worked on them last year
    const allowance = self.nominal_allowance
      + self.manual_adjustment
      + self.employement_range_adjustment;

    const period_starts_at = moment.utc(self.user.start_date).year() === now.year()
      ? moment.utc(self.user.start_date)
      : now.clone().startOf('year');

    const period_ends_at = self.user.end_date && moment.utc(self.user.end_date).year() <= now.year()
      ? moment.utc(self.user.end_date)
      : now.clone().endOf('year');

    let days_in_period = period_ends_at.diff( period_starts_at, 'days' );

    let delta = allowance * period_ends_at.diff( now, 'days' ) / days_in_period;

    return -1 * (Math.round(delta * 2) / 2).toFixed(1);
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
     holiday_year_start_month  = args.holiday_year_start_month ,
      year = args.year,
      number_of_days_taken_from_allowance,
      manual_adjustment,
      carried_over_allowance;

    if(holiday_year_start_month  === -1){
     holiday_year_start_month  = user.company.holiday_year_start_month;
    }

    const {forceNow, now} = args;

    let flow = Promise.resolve();

    if ( user.my_leaves === undefined ) {
      flow = flow.then(() => user.reload_with_leave_details({holiday_year_start_month ,year}));
    }

    // Fetch adjustment and Carry over allowance
    flow = flow.then(() => user.promise_adjustment_and_carry_over_for_year(holiday_year_start_month ,year));

    flow = flow.then(adjustment_and_coa => {
      manual_adjustment      = adjustment_and_coa.adjustment;
      carried_over_allowance = adjustment_and_coa.carried_over_allowance;
      holiday_year_start_month = args.holiday_year_start_month;
      return Promise.resolve();
    });

    flow = flow.then(() => Promise.resolve(
      number_of_days_taken_from_allowance = user.calculate_number_of_days_taken_from_allowance({holiday_year_start_month :holiday_year_start_month ,year : year.format('YYYY')})
    ));


    // Got all necessary data for UserAllowance object so build it!
    flow = flow.then(() => {
      holiday_year_start_month
      const args = {
        user,
        manual_adjustment,
        number_of_days_taken_from_allowance,
        carry_over:        carried_over_allowance,
        nominal_allowance: user.department.allowance,
        
      };

      if (forceNow && now) {
        args.now = now;
      } else if (year ){
        if(moment.utc(year).year() <= year.year()-1 && moment.utc(year).month() <=  holiday_year_start_month.month()){
          args.now  =  moment.utc(year).subtract(1, "year").month(holiday_year_start_month ).startOf('month').format('YYYY-MM-DD')
        }
      }

      return new UserAllowance(args);
    });

    return flow;
  }
}

module.exports = UserAllowance;

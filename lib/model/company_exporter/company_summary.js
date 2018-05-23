
'use strict';

const
  Promise = require('bluebird'),
  CSV     = Promise.promisifyAll(require('csv')),
  moment  = require('moment'),
  Joi     = require('joi');

const
  schema_constructor = Joi.object().required().keys({
    company : Joi.object().required(),
    users   : Joi.array().required(),
  });

class CompanySummary {
  constructor(args) {
    args = Joi.attempt(
      args,
      schema_constructor,
      "Failed to in stantiate companySummary due to validation"
    );

    this._company = args.company;
    this._users   = args.users;
  }

  get company() { return this._company }
  get users()   { return this._users }

  as_csv_data() {
    let
      self = this,
      results = [],
      date_format = self.company.get_default_date_format();

    // Put headers
    results.push(['department', 'lastname', 'name', 'email', 'start_date', 'end_date']);

    self.users.forEach(u => u.my_leaves.forEach(l => {
      results.push( [
        u.DepartmentId,
        u.lastname,
        u.name,
        u.email,
        moment(l.date_start).format(date_format),
        moment(l.date_end).format(date_format)
      ])
    }));


    return results;
  }

  promise_as_csv_string() {
    const self = this;

    return Promise
      .resolve( self.as_csv_data() )
      .then( data => CSV.stringifyAsync( data ) )
  }

}

module.exports = CompanySummary;

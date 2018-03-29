
'use strict';

const
  expect        = require('chai').expect,
  moment        = require('moment'),
  UserAllowance = require('../../../../lib/model/user_allowance'),
  model         = require('../../../../lib/model/db');

describe('employement_range_adjustment attribute', function(){

  describe('Employee start day is in previouse year and no end date',function(){
    let employee = model.User.build({
      start_date : moment('2015-07-14'),
    });

    it('no automatic adjustment', function(){

      let ul = new UserAllowance({
        user : employee,
        now  : moment('2016-07-20'),

        // Rest of parameters do not really matter
        number_of_days_taken_from_allowance : 0,
        manual_adjustment                   : 0,
        carry_over                          : 0,
        nominal_allowance                   : 20,
      });

      expect( ul.employement_range_adjustment ).to.be.equal(0);
    });
  });

  describe('Employee start date is in prevouse year but end date is in current year', function(){
    let employee = model.User.build({
      start_date : moment('2015-04-23'),
      end_date   : moment('2016-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2016-02-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('ajustment is made based on end date', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(-15);
    });
  });

  describe('Employee start date is in previouse year and end date is in next year', function(){
   var employee = model.User.build({
      start_date : moment('2015-04-23'),
      end_date   : moment('2017-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2016-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('ajustment is made based on end date', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(0);
    });
  });

  describe('Start date is in current year, no end date', function(){
    var employee = model.User.build({
      start_date : moment('2018-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2018-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('adjustment is made based on start date', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(-5);
    });
  });

  describe('Start date is in current year, end date is in current year either',function(){
    var employee = model.User.build({
      start_date : moment('2016-04-01'),
      end_date   : moment('2016-10-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2016-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('adjustment is made based on start and end dates', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(-10);
    });
  });

  describe('Start date is in current year, end date is in next year', function(){
    var employee = model.User.build({
      start_date : moment('2018-04-01'),
      end_date   : moment('2019-10-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2018-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('adjustment is made based on start date', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(-5);
    });
  });

  describe('Start date is in next year, no end date', function(){
    var employee = model.User.build({
      start_date : moment('2018-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2016-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('No adjustment is needed', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(0);
    });
  });

  describe('Start date is in next year, end date is defined',function(){
    var employee = model.User.build({
      start_date : moment('2017-04-01'),
      end_date   : moment('2017-10-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      now  : moment('2016-07-20'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('No adjustment is needed', function(){
      expect( ul.employement_range_adjustment ).to.be.equal(0);
    });
  });
});

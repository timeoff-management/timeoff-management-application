
'use strict';

const
  expect        = require('chai').expect,
  moment        = require('moment'),
  UserAllowance = require('../../../lib/model/user_allowance'),
  model         = require('../../../lib/model/db');

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
   let employee = model.User.build({
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
    let employee = model.User.build({
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
    let employee = model.User.build({
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
    let employee = model.User.build({
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
    let employee = model.User.build({
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
    let employee = model.User.build({
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


describe('accrued_adjustment attribute', function(){

  describe('Employee started last year, today is is beginning of Feb', () => {
    let employee = model.User.build({
      start_date : moment('2016-10-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      year : moment('2017', 'YYYY'),
      now  : moment('2017-02-01'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 24,
    });

    it('Ensure year total alloance is correct', () => {
      expect( ul.total_number_of_days_in_allowance ).to.be.eql(24);
    });

    it('Check accrued_adjustment', () => {
      expect( ul.accrued_adjustment ).to.be.eql(-22);
    });
  });

  describe('Started in Apr, today is Jul', () => {
    let employee = model.User.build({
      start_date : moment('2016-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      year : moment('2016', 'YYYY'),
      now  : moment('2016-07-01'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 0,
      nominal_allowance                   : 24,
    });

    it('Ensure year total alloance is correct', () => {
      expect( ul.total_number_of_days_in_allowance ).to.be.eql(18);
    });

    it('Check accrued_adjustment', () => {
      expect( ul.accrued_adjustment ).to.be.eql(-12);
    });
  });

  describe('Started in Apr, today is Jul: carry over is ignored in accrual adjustment', () => {
    let employee = model.User.build({
      start_date : moment('2016-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      year : moment('2016', 'YYYY'),
      now  : moment('2016-07-01'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 0,
      carry_over                          : 10,
      nominal_allowance                   : 24,
    });

    it('Ensure year total alloance is correct', () => {
      // 18, because start/end adjustment affects only nominal allowance
      // but not manula adjuatements
      // so 18 = 24 * .75 + 10
      expect( ul.total_number_of_days_in_allowance ).to.be.eql(28);
    });

    it('Check accrued_adjustment', () => {
      expect( ul.accrued_adjustment ).to.be.eql(-12);
    });
  });

  describe('Started in Apr, today is Jul: manual adjustments is taked into consideration', () => {
    let employee = model.User.build({
      start_date : moment('2016-04-01'),
    });

    let ul = new UserAllowance({
      user : employee,
      year : moment('2016', 'YYYY'),
      now  : moment('2016-07-01'),

      number_of_days_taken_from_allowance : 0,
      manual_adjustment                   : 4,
      carry_over                          : 0,
      nominal_allowance                   : 20,
    });

    it('Ensure year total alloance is correct', () => {
      expect( ul.total_number_of_days_in_allowance ).to.be.eql( 20 * 0.75 + 4);
    });

    it('Check accrued_adjustment', () => {
      expect( ul.accrued_adjustment ).to.be.eql(-12.5);
    });
  });

  // TODO
  // 1. Check case when it is 1 Jan and employee started last year
  // 2. Check case when it is 31 Jan and employee started last year

});

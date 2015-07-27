
'use strict';

var expect  = require('chai').expect,
    _       = require('underscore'),
    moment  = require('moment'),
    model   = require('../../../../lib/model/db');

describe('get_automatic_adjustment method', function(){

  describe('Employee start day is in previouse year and no end date',function(){
    var employee = model.User.build({
      start_date : moment('2014-07-14'),
    });

    it('no automatic adjustment', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(0)
    });
  });

  describe('Employee start date is in prevouse year but end date is in current year', function(){
    var employee = model.User.build({
      start_date : moment('2014-04-23'),
      end_date : moment('2015-04-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('ajustment is made based on end date', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-02-20')}))
        .to.be.equal(-15);
    });
  });

  describe('Employee start date is in previouse year and end date is in next year', function(){
   var employee = model.User.build({
      start_date : moment('2014-04-23'),
      end_date : moment('2016-04-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('ajustment is made based on end date', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(0);
    });
  });

  describe('Start date is in current year, no end date', function(){
    var employee = model.User.build({
      start_date : moment('2015-04-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('adjustment is made based on start date', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(-5);
    });

  });

  describe('Start date is in current year, end date is in current year either',function(){
    var employee = model.User.build({
      start_date : moment('2015-04-01'),
      end_date : moment('2015-10-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('adjustment is made based on start and end dates', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(-10);
    });
  });

  describe('Start date is in current year, end date is in next year', function(){
    var employee = model.User.build({
      start_date : moment('2015-04-01'),
      end_date : moment('2016-10-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('adjustment is made based on start date', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(-5);
    });
  });

  describe('Start date is in next year, no end date', function(){
    var employee = model.User.build({
      start_date : moment('2016-04-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('No adjustment is needed', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(0);
    });
  });

  describe('Start date is in next year, end date is defined',function(){
    var employee = model.User.build({
      start_date : moment('2016-04-01'),
      end_date : moment('2016-10-01'),
    });
    employee.department = {
      allowence : 20,
    };

    it('No adjustment is needed', function(){
      expect(employee.get_automatic_adjustment({now : moment('2015-07-20')}))
        .to.be.equal(0);
    });
  });
});

'use strict'

const expect = require('chai').expect;
  const _ = require('underscore');
  const model = require('../../../../lib/model/db')

const default_params = {
  date_start: '2015-04-09',
  date_end: '2015-04-10',
  status: 1,
  day_part_start: 1,
  day_part_end: 1
}

describe('Check get_objects_for_bulk_create', function() {
  it('Check case when start and finish dates are the same', function() {
    const params = _.clone(default_params)
    params.date_start = '2015-04-09'
    params.date_end = '2015-04-09'

    const leave = model.Leave.build(params)

    expect(
      _.map(leave.get_days(), function(d) {
        return { date: d.date, day_part: d.day_part }
      })
    ).to.be.eql([
      {
        date: '2015-04-09',
        day_part: 1
      }
    ])
  })

  it('Start and end dates are the same, and half day', function() {
    const params = _.clone(default_params)
    params.date_start = '2015-04-09'
    params.date_end = '2015-04-09'
    params.day_part_start = 3
    // finish date part setting is ignored if both dates are the sane
    params.day_part_end = 1

    const leave = model.Leave.build(params)

    expect(
      _.map(leave.get_days(), function(d) {
        return { date: d.date, day_part: d.day_part }
      })
    ).to.be.eql([
      {
        date: '2015-04-09',
        day_part: 3
      }
    ])
  })

  it('Two days in a row', function() {
    const params = _.clone(default_params)
    const leave = model.Leave.build(params)

    expect(
      _.map(leave.get_days(), function(d) {
        return { date: d.date, day_part: d.day_part }
      })
    ).to.be.eql([
      {
        date: '2015-04-09',
        day_part: 1
      },
      {
        date: '2015-04-10',
        day_part: 1
      }
    ])
  })

  it('Three days in a row with first half day', function() {
    const params = _.clone(default_params)
    params.date_end = '2015-04-11'
    params.day_part_start = 3

    const leave = model.Leave.build(params)

    expect(
      _.map(leave.get_days(), function(d) {
        return { date: d.date, day_part: d.day_part }
      })
    ).to.be.eql([
      {
        date: '2015-04-09',
        day_part: 3
      },
      {
        date: '2015-04-10',
        day_part: 1
      },
      {
        date: '2015-04-11',
        day_part: 1
      }
    ])
  })
})

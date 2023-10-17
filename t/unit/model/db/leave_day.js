"use strict";

var expect = require("chai").expect,
  _ = require("underscore"),
  model = require("../../../../lib/model/db");

var default_params = {
  date_start: "2015-04-09",
  date_end: "2015-04-10",
  status: 1,
  day_part_start: 1,
  day_part_end: 1,
};

describe("Check get_objects_for_bulk_create", function () {
  it("Check case when start and finish dates are the same", function () {
    var params = _.clone(default_params);
    params.date_start = "2015-04-09";
    params.date_end = "2015-04-09";

    var leave = model.Leave.build(params);

    expect(
      _.map(leave.get_days(), function (d) {
        return { date: d.date, day_part: d.day_part };
      })
    ).to.be.eql([
      {
        date: "2015-04-09",
        day_part: 1,
      },
    ]);
  });

  it("Start and end dates are the same, and half day", function () {
    var params = _.clone(default_params);
    params.date_start = "2015-04-09";
    params.date_end = "2015-04-09";
    params.day_part_start = 3;
    // finish date part setting is ignored if both dates are the sane
    params.day_part_end = 1;

    var leave = model.Leave.build(params);

    expect(
      _.map(leave.get_days(), function (d) {
        return { date: d.date, day_part: d.day_part };
      })
    ).to.be.eql([
      {
        date: "2015-04-09",
        day_part: 3,
      },
    ]);
  });

  it("Two days in a row", function () {
    var params = _.clone(default_params);
    var leave = model.Leave.build(params);

    expect(
      _.map(leave.get_days(), function (d) {
        return { date: d.date, day_part: d.day_part };
      })
    ).to.be.eql([
      {
        date: "2015-04-09",
        day_part: 1,
      },
      {
        date: "2015-04-10",
        day_part: 1,
      },
    ]);
  });

  it("Three days in a row with first half day", function () {
    var params = _.clone(default_params);
    params.date_end = "2015-04-11";
    params.day_part_start = 3;

    var leave = model.Leave.build(params);

    expect(
      _.map(leave.get_days(), function (d) {
        return { date: d.date, day_part: d.day_part };
      })
    ).to.be.eql([
      {
        date: "2015-04-09",
        day_part: 3,
      },
      {
        date: "2015-04-10",
        day_part: 1,
      },
      {
        date: "2015-04-11",
        day_part: 1,
      },
    ]);
  });
});

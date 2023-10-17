"use strict";

var webdriver = require("selenium-webdriver"),
  _ = require("underscore"),
  By = require("selenium-webdriver").By,
  expect = require("chai").expect,
  Promise = require("bluebird");

var check_booking_func = Promise.promisify(function (args, callback) {
  var driver = args.driver,
    type = args.type,
    full_days = args.full_days,
    halfs_1st_days = args.halfs_1st_days || [],
    halfs_2nd_days = args.halfs_2nd_days || [],
    result_callback = callback,
    type_css_re;

  if (type === "pended") {
    type_css_re = /\bleave_cell_pended\b/;
  } else if (type === "approved") {
    type_css_re = /\bleave_cell\b/;
  } else {
    throw new Error("Mandatory type parameter was not provided");
  }

  Promise.all([
    _.map(
      [
        { days: full_days, halfs: ["half_1st", "half_2nd"] },
        { days: halfs_1st_days, halfs: ["half_1st"] },
        { days: halfs_2nd_days, halfs: ["half_2nd"] },
      ],
      function (option) {
        return _.map(option.days, function (day) {
          return Promise.all([
            _.map(option.halfs, function (half) {
              var selector =
                "table.month_" +
                day.format("MMMM") +
                " td.day_" +
                day.format("D") +
                "." +
                half;

              return driver
                .findElement(By.css(selector))
                .then(function (el) {
                  return el.getAttribute("class");
                })
                .then(function (css) {
                  expect(css).to.match(type_css_re);
                });
            }),
          ]);
        });
      }
    ),
  ]).then(function () {
    // "export" current driver
    result_callback(null, {
      driver: driver,
    });
  });
});

module.exports = function (args) {
  return args.driver.call(function () {
    return check_booking_func(args);
  });
};

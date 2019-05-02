"use strict";

var webdriver = require("selenium-webdriver"),
  Promise = require("bluebird");

module.exports = async function(args) {
  var url = args.url,
    driver = args.driver;

  // Open front page
  await driver.get(url);

  return {
    driver: driver
  };
};

var webdriver = require("selenium-webdriver"),
  chrome = require("selenium-webdriver/chrome");
capabilities = process.env.USE_CHROME ? "chrome" : "phantomjs";

module.exports = function () {
  if (capabilities === "phantomjs") {
    return new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities[capabilities]())
      .build();
  }

  var options = new chrome.Options();
  if (!process.env.SHOW_CHROME) {
    options.addArguments("headless");
    options.addArguments("disable-gpu");
  }

  return new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities[capabilities]())
    .setChromeOptions(options)
    .build();
};

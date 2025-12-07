const webdriver = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const capabilities = process.env.USE_CHROME ? 'chrome' : 'phantomjs'

module.exports = function() {
  if (capabilities === 'phantomjs') {
    return new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities[capabilities]())
      .build()
  }

  const options = new chrome.Options()
  if (!process.env.SHOW_CHROME) {
    options.addArguments('headless')
    options.addArguments('disable-gpu')
  }

  return new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities[capabilities]())
    .setChromeOptions(options)
    .build()
}

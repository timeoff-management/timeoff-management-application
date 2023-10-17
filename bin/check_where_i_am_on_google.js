// Usage:
//  node  bin/check_where_i_am_on_google.js --domain="nixieshop.com" --query="nixie shop"

"use strict"

var optimist = require("optimist").argv,
  search_query = optimist.query || "time off manager",
  web_site_domain = optimist.domain || "timeoffmanager.com",
  stop_on_first = true

console.log("-----------------------------------")
console.log("  Cheking query string : " + search_query)
console.log("  Look for domain      : " + web_site_domain)
console.log("-----------------------------------")

var webdriver = require("selenium-webdriver"),
  _ = require("underscore"),
  google_url = "https://www.google.com/search?q=" + search_query + "&start=",
  driver

// Instantiate new driver object
driver = new webdriver.Builder()
  .withCapabilities(webdriver.Capabilities.chrome())
  .build()

_.map(
  [
    0,
    10,
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100,
    110,
    120,
    130,
    140,
    150,
    160,
    170,
    180,
    190,
    200,
    210,
    220,
    230,
    240,
    250,
    260,
    270,
    280,
    290,
    300,
    310,
    320,
    330,
    340,
    350,
    360,
    370,
    380,
    390,
    400,
    410,
    420,
    430,
    440,
    450,
    460,
    470,
    480,
    490,
    500
    //    510,520,530,540,550,560,570,580,590,600,
    //    610,620,630,640,650,660,670,680,690,700,
    //    710,720,730,740,750,760,770,780,790,800,
    //    810,820,830,840,850,860,870,880,890,900,
    //    910,920,930,940,950,960,970,980,990,1000,
  ],
  function(i) {
    driver.sleep(500)

    // Go to front page
    driver.get(google_url + i)

    driver.getPageSource().then(function(source) {
      if (source.match(new RegExp("http(s)?://(www.)?" + web_site_domain))) {
        console.log(">>>>>>> Found on " + (1 + i / 10) + " page")
        if (stop_on_first) {
          driver.quit().then(function() {
            process.exit()
          })
        }
      } else {
        console.log(1 + i / 10 + "...")
      }
    })
  }
)

driver.quit()

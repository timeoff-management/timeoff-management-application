"use strict";

const test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../lib/register_new_user"),
  open_page_func = require("../lib/open_page"),
  submit_form_func = require("../lib/submit_form"),
  check_elements_func = require("../lib/check_elements"),
  By = require("selenium-webdriver").By,
  config = require("../lib/config"),
  application_host = config.get_application_host(),
  expect = require("chai").expect,
  Bluebird = require("bluebird"),
  moment = require("moment"),
  company_edit_form_id = "#company_edit_form",
  userStartsAtTheBeginingOfYear = require("../lib/set_user_to_start_at_the_beginning_of_the_year");

/*
 *  Basic scenario for checking time zones:
 *
 *  * Create a company
 *  * Update Time zone to be somethng in Tonga
 *  * Get the date from Book leave modal and put it into today_tonga
 *  * Get the current date from Calendar page and ensure it is the same as today_tonga
 *  * Get the current date from Team view page and ensure it is the same as today_tonga
 *  * Book a leave and ensure its "created at" value on My requests page is today_tonga
 *  * Reject newly added leave
 *  * Update Time zone to be Pacific/Midway
 *  * Get the date from Book leave modal and put it into today_usa
 *  * Ensure that today_usa is one day behind the today_tonga
 *  * Get the current date from Calendar page and ensure it is the same as today_usa
 *  * Get the current date from Team view page and ensure it is the same as today_usa
 *  * Book a leave and ensure its "created at" value on My requests page is today_usa
 *
 * */

describe("Check Time zones", function () {
  let driver, user_email, today_usa, today_tonga;

  this.timeout(config.get_execution_timeout());

  it("Create a company", function (done) {
    register_new_user_func({
      application_host: application_host,
    }).then(function (data) {
      driver = data.driver;
      user_email = data.email;
      done();
    });
  });

  it("Ensure user starts at the very beginning of current year", (done) => {
    userStartsAtTheBeginingOfYear({ driver, email: user_email })
      .then(() => open_page_func({ url: application_host, driver }))
      .then(() => done());
  });

  it("Open page for editing company details", function (done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver,
    }).then(() => done());
  });

  it("Update Time zone to be somethng in Tonga", function (done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: company_edit_form_id + ' select[name="timezone"]',
          option_selector: 'option[value="Pacific/Tongatapu"]',
          value: "Pacific/Tongatapu",
        },
      ],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    }).then(function () {
      done();
    });
  });

  it("Get the date from Book leave modal and put it into today_tonga variable", function (done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
      .then((el) => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() => driver.findElement(By.css("input.book-leave-from-input")))
      .then((el) => el.getAttribute("value"))
      .then((today) => {
        today_tonga = today;
        done();
      });
  });

  it("Get the current date from Calendar page and ensure it is the same as today_tonga", function (done) {
    open_page_func({
      url: application_host + "calendar/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css(
            "table.month_" +
              moment(today_tonga).format("MMMM") +
              " td.half_1st.day_" +
              moment(today_tonga).format("D") +
              ".current_day_cell"
          )
        )
      )
      .then((el) => {
        expect(el, "Ensure that current date is marked correctly").to.exist;
        done();
      });
  });

  it("Get the current date from Team view page and ensure it is the same as today_tonga", function (done) {
    open_page_func({
      url: application_host + "calendar/teamview/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css(
            "table.team-view-table td.half_1st.day_" +
              moment(today_tonga).format("D") +
              ".current_day_cell"
          )
        )
      )
      .then((el) => {
        expect(el, "Ensure that current date is marked correctly").to.exist;

        return driver.findElement(By.css("div.calendar-section-caption"));
      })
      .then((el) => el.getText())
      .then((month_caption) => {
        expect(month_caption, "Ensure month is correct").to.be.eql(
          moment(today_tonga).format("MMMM, YYYY")
        );
        done();
      });
  });

  it("Open Book leave popup window", function (done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
      .then((el) => el.click())
      // This is very important line when working with Bootstrap modals!
      .then((el) => driver.sleep(1000))
      .then(() => done());
  });

  it("Submit new leave request", function (done) {
    submit_form_func({
      driver: driver,
      form_params: [],
      message: /New leave request was added/,
    }).then(() => done());
  });

  it('Ensure its "created at" value on My requests page is today_tonga', function (done) {
    open_page_func({
      url: application_host + "requests/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css('tr[vpp="pending_for__' + user_email + '"] td.date_of_request')
        )
      )
      .then((el) => el.getText())
      .then((text) => {
        expect(text).to.be.eql(moment(today_tonga).format("YYYY-MM-DD"));
        done();
      });
  });

  it("Reject newly added leave", function (done) {
    driver
      .findElement(
        By.css(
          'tr[vpp="pending_for__' + user_email + '"] input[value="Reject"]'
        )
      )
      .then((el) => el.click())
      .then(() => done());
  });

  it("Open page for editing company details", function (done) {
    open_page_func({
      url: application_host + "settings/general/",
      driver: driver,
    }).then(() => done());
  });

  it("Update Time zone to be Pacific/Midway", function (done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: company_edit_form_id + ' select[name="timezone"]',
          option_selector: 'option[value="Pacific/Midway"]',
          value: "Pacific/Midway",
        },
      ],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    }).then(function () {
      done();
    });
  });

  it("Get the date from Book leave modal and put it into today_usa", function (done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
      .then((el) => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() => driver.findElement(By.css("input.book-leave-from-input")))
      .then((el) => el.getAttribute("value"))
      .then((today) => {
        today_usa = today;
        done();
      });
  });

  it("Ensure that today_usa is one day behind the today_tonga", function (done) {
    expect(moment(today_usa).format("YYYY-MM-DD")).to.be.not.eql(
      moment(today_tonga).format("YYYY-MM-DD")
    );
    done();
  });

  it("Get the current date from Calendar page and ensure it is the same as today_usa", function (done) {
    open_page_func({
      url: application_host + "calendar/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css(
            "table.month_" +
              moment(today_usa).format("MMMM") +
              " td.half_1st.day_" +
              moment(today_usa).format("D") +
              ".current_day_cell"
          )
        )
      )
      .then((el) => {
        expect(el, "Ensure that current date is marked correctly").to.exist;
        done();
      });
  });

  it("Get the current date from Team view page and ensure it is the same as today_usa", function (done) {
    open_page_func({
      url: application_host + "calendar/teamview/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css(
            "table.team-view-table td.half_1st.day_" +
              moment(today_usa).format("D") +
              ".current_day_cell"
          )
        )
      )
      .then((el) => {
        expect(el, "Ensure that current date is marked correctly").to.exist;

        return driver.findElement(By.css("div.calendar-section-caption"));
      })
      .then((el) => el.getText())
      .then((month_caption) => {
        expect(month_caption, "Ensure month is correct").to.be.eql(
          moment(today_usa).format("MMMM, YYYY")
        );
        done();
      });
  });

  it("Open Book leave popup window", function (done) {
    driver
      .findElement(By.css("#book_time_off_btn"))
      .then((el) => el.click())
      // This is very important line when working with Bootstrap modals!
      .then((el) => driver.sleep(1000))
      .then(() => done());
  });

  it("Submit new leave request", function (done) {
    submit_form_func({
      driver: driver,
      form_params: [],
      message: /New leave request was added/,
    }).then(() => done());
  });

  it('Ensure its "created at" value on My requests page is today_usa', function (done) {
    open_page_func({
      url: application_host + "requests/",
      driver: driver,
    })
      .then(() =>
        driver.findElement(
          By.css('tr[vpp="pending_for__' + user_email + '"] td.date_of_request')
        )
      )
      .then((el) => el.getText())
      .then((text) => {
        expect(text).to.be.eql(moment(today_usa).format("YYYY-MM-DD"));
        done();
      });
  });

  after(function (done) {
    driver.quit().then(() => done());
  });
});

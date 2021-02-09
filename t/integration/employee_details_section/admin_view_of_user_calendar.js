
'use strict';

const By                 = require('selenium-webdriver').By,
  moment                 = require('moment'),
  addNewUserFunc         = require('../../lib/add_new_user'),
  config                 = require('../../lib/config'),
  loginUserFunc        = require('../../lib/login_with_user'),
  logoutUserFunc       = require('../../lib/logout_user'),
  openPageFunc         = require('../../lib/open_page'),
  registerNewUserFunc = require('../../lib/register_new_user'),
  submitFormFunc       = require('../../lib/submit_form'),
  userInfoFunc         = require('../../lib/user_info'),
  application_host       = config.get_application_host(),
  checkBookingFunc     = require('../../lib/check_booking_on_calendar'),
  someWeekdayDate    =  moment().utc().startOf('year').add(1, 'week').startOf('isoWeek').add(2, 'day').format('YYYY-MM-DD');

/*
 * Aim:
 *  To ensure admin can access employee's Calendar on Employee's details section and the
 *   calendar shows leaves.
 *
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as employee B and submit leave request
 *    * Login as admin user A
 *    * Go to user B details, ensure new request is shown on the Calendar section
 * */
describe('Ensure employee calendar from admin section shows bookings', function(){

  this.timeout( config.get_execution_timeout() );

  let driver, emailA, emailB, userIdB;

  it("Register new company", async () => {
    ({driver: driver, email: emailA} = await registerNewUserFunc({ application_host }));
  });

  it("Create second user B", async () => {
    ({new_user_email: emailB} = await addNewUserFunc({ application_host, driver }));
  });

  it("Obtain information about user B", async () => {
    ({user: {id: userIdB}} = await userInfoFunc({ driver, email: emailB }));
  });

  it("Logout from user A (admin)", async () => {
    await logoutUserFunc({ application_host, driver });
  });

  it("Login as user B", async () => {
    await loginUserFunc({ application_host, driver, user_email: emailB });
  });

  it("Open Book leave popup window", async () => {
    const el = await driver.findElement(By.css('#book_time_off_btn'));
    await el.click();

    // This is very important line when working with Bootstrap modals!
    await driver.sleep(1000);
  });

  it("Submit new leave request from user B", async () => {
    await submitFormFunc({
      driver,
      form_params : [{
        selector : 'input#from',
        value    : someWeekdayDate,
      },{
        selector : 'input#to',
        value    : someWeekdayDate,
      }],
      message : /New leave request was added/,
    });
  });

  it("Logout from user B", async () => {
    await logoutUserFunc({ application_host, driver });
  });

  it("Login as admin user A", async () => {
    await loginUserFunc({ driver, application_host, user_email: emailA });
  });

  it('Open user B calendar section and ensure the newly added booking is there', async () => {
    await openPageFunc({
      driver,
      url: `${application_host}users/edit/${userIdB}/calendar/`,
    });

    await checkBookingFunc({
      driver,
      full_days: [moment(someWeekdayDate)],
      type: 'pended',
    })
  });

  after(async () => {
    await driver.quit();
  });

});

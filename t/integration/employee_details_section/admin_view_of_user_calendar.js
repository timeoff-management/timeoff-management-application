'use strict'

const By = require('selenium-webdriver').By;
  const moment = require('moment');
  const addNewUserFunc = require('../../lib/add_new_user');
  const config = require('../../lib/config');
  const loginUserFunc = require('../../lib/login_with_user');
  const logoutUserFunc = require('../../lib/logout_user');
  const openPageFunc = require('../../lib/open_page');
  const registerNewUserFunc = require('../../lib/register_new_user');
  const submitFormFunc = require('../../lib/submit_form');
  const userInfoFunc = require('../../lib/user_info');
  const application_host = config.get_application_host();
  const checkBookingFunc = require('../../lib/check_booking_on_calendar');
  const someWeekdayDate = moment()
    .utc()
    .startOf('year')
    .add(1, 'week')
    .startOf('isoWeek')
    .add(2, 'day')
    .format('YYYY-MM-DD')

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
describe('Ensure employee calendar from admin section shows bookings', function() {
  this.timeout(config.get_execution_timeout())

  let driver, emailA, emailB, userIdB

  it('Register new company', async function() {
    ;({ driver, email: emailA } = await registerNewUserFunc({
      application_host
    }))
  })

  it('Create second user B', async function() {
    ;({ new_user_email: emailB } = await addNewUserFunc({
      application_host,
      driver
    }))
  })

  it('Obtain information about user B', async function() {
    ;({
      user: { id: userIdB }
    } = await userInfoFunc({ driver, email: emailB }))
  })

  it('Logout from user A (admin)', async function() {
    await logoutUserFunc({ application_host, driver })
  })

  it('Login as user B', async function() {
    await loginUserFunc({ application_host, driver, user_email: emailB })
  })

  it('Open Book leave popup window', async function() {
    const el = await driver.findElement(By.css('#book_time_off_btn'))
    await el.click()

    // This is very important line when working with Bootstrap modals!
    await driver.sleep(1000)
  })

  it('Submit new leave request from user B', async function() {
    await submitFormFunc({
      driver,
      form_params: [
        {
          selector: 'input#from',
          value: someWeekdayDate
        },
        {
          selector: 'input#to',
          value: someWeekdayDate
        }
      ],
      message: /New leave request was added/
    })
  })

  it('Logout from user B', async function() {
    await logoutUserFunc({ application_host, driver })
  })

  it('Login as admin user A', async function() {
    await loginUserFunc({ driver, application_host, user_email: emailA })
  })

  it('Open user B calendar section and ensure the newly added booking is there', async function() {
    await openPageFunc({
      driver,
      url: `${application_host}users/edit/${userIdB}/calendar/`
    })

    await checkBookingFunc({
      driver,
      full_days: [moment(someWeekdayDate)],
      type: 'pended'
    })
  })

  after(async function() {
    await driver.quit()
  })
})

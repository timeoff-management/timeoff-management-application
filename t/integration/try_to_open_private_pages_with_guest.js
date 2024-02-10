'use strict'

const test = require('selenium-webdriver/testing');
  const config = require('../lib/config');
  const application_host = config.get_application_host();
  const By = require('selenium-webdriver').By;
  const expect = require('chai').expect;
  const _ = require('underscore');
  const Promise = require('bluebird');
  const until = require('selenium-webdriver').until;
  const login_user_func = require('../lib/login_with_user');
  const register_new_user_func = require('../lib/register_new_user');
  const logout_user_func = require('../lib/logout_user');
  const add_new_user_func = require('../lib/add_new_user');
  const build_driver = require('../lib/build_driver')

describe('Try to access private pages with guest user', function() {
  this.timeout(config.get_execution_timeout())

  it('Check pages', function(done) {
    Promise.all(
      _.map(
        // Add more URLs to check into the array below
        ['logout/', 'settings/general/', 'settings/departments/'],
        function(path) {
          const driver = build_driver()

          // Open front page
          driver.get(application_host + path)
          driver.getCurrentUrl().then(function(url) {
            expect(url).to.be.equal(application_host + 'login/')
          })

          return driver.quit()
        }
      )
    ).then(function() {
      done()
    })
  })

  it('Check main (dashboard) page', function(done) {
    const driver = build_driver()

    // Open front page
    driver.get(application_host)
    driver.getTitle().then(function(title) {
      expect(title).to.be.equal('Time Off Management')
    })
    driver.quit().then(function() {
      done()
    })
  })
})

describe('Try to access admin pages with non-admin user', function() {
  this.timeout(config.get_execution_timeout())

  let non_admin_user_email, driver

  const check_pathes = function(driver, reachable) {
    const admin_pages = [
      'users/add/',
      'users/',
      'settings/general/',
      'settings/departments/'
    ]

    return Promise.each(admin_pages, function(path) {
      driver.get(application_host + path)
      driver.wait(until.elementLocated(By.css('body')), 1000)
      return driver.getCurrentUrl().then(function(url) {
        if (reachable) {
          expect(url).to.be.equal(application_host + path)
        } else {
          expect(url).to.be.equal(application_host + 'calendar/')
        }
      })
    })
  }

  it('Register new admin user', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it('Iterate through admin pages and make sure they are accessible', function(done) {
    check_pathes(driver, true).then(function() {
      done()
    })
  })

  it('Add new non-admin user', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function(data) {
      non_admin_user_email = data.new_user_email
      done()
    })
  })

  it('Logout from admin account', function(done) {
    logout_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it('And login with newly created non-admin account', function(done) {
    login_user_func({
      application_host,
      user_email: non_admin_user_email,
      driver
    }).then(function() {
      done()
    })
  })

  it('Iterate throough pathes and make sure they are not reachable', function(done) {
    check_pathes(driver, false).then(function() {
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

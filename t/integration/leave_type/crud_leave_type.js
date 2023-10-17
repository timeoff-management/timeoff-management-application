'use strict'

const test = require('selenium-webdriver/testing'),
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  By = require('selenium-webdriver').By,
  config = require('../../lib/config'),
  Bluebird = require('bluebird'),
  expect = require('chai').expect,
  application_host = config.get_application_host(),
  leave_type_edit_form_id = '#leave_type_edit_form',
  leave_type_new_form_id = '#leave_type_new_form'

describe('CRUD for leave types', function() {
  var driver

  this.timeout(config.get_execution_timeout())

  it('Performing registration process', function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it('Open page with leave types', function(done) {
    open_page_func({
      url: application_host + 'settings/general/',
      driver: driver
    }).then(function() {
      done()
    })
  })

  it('Check if there are default leave types', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Sick Leave'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Make sure default colours are set for leave types', done => {
    driver
      .findElements(By.css('form#leave_type_edit_form [data-tom-color-picker]'))
      .then(els => {
        expect(
          els.length,
          'Ensure number of colour pickers is the same as leave types'
        ).to.be.equal(2)

        return Bluebird.map(els, el =>
          el.findElement(By.css('input[type="hidden"]'))
        )
      })
      .then(els => Bluebird.map(els, el => el.getAttribute('value')))
      .then(colours => {
        expect(colours.sort(), 'Check default colour values').to.be.deep.equal([
          'leave_type_color_1',
          'leave_type_color_1'
        ])
        done()
      })
  })

  it('Change Sick leave type to be non-default colour', done => {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] button.dropdown-toggle',
          dropdown_option:
            leave_type_edit_form_id +
            ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] [data-tom-color-picker-css-class="leave_type_color_2"]'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/
    }).then(() => done())
  })

  it('Ensure that color class for Sick days was updated to be non-default', done => {
    driver
      .findElements(
        By.css(
          'form#leave_type_edit_form [data-tom-color-picker] input[type="hidden"]'
        )
      )
      .then(els => Bluebird.map(els, el => el.getAttribute('value')))
      .then(colours => {
        expect(colours.sort(), 'Check default colour values').to.be.deep.equal([
          'leave_type_color_1',
          'leave_type_color_2'
        ])
        done()
      })
  })

  it('Make sure that both leave types have "use allowance" tick boxes set', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="allowance_0"]',
          tick: true,
          value: 'on'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="allowance_1"]',
          tick: true,
          value: 'off'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Check that updating "use allowance flag" works', function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="allowance_1"]',
          tick: true,
          value: 'on'
        }
      ],
      should_be_successful: true,
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/
    }).then(function() {
      done()
    })
  })

  it('Double check that "use allowance" tick boxes were updated correctly', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="allowance_0"]',
          value: 'on',
          tick: true
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="allowance_1"]',
          value: 'on',
          tick: true
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Check that it is possible to update Limits', function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="limit_0"]',
          value: '0'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="limit_1"]',
          value: '5'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      should_be_successful: true,
      message: /Changes to leave types were saved/
    }).then(function() {
      done()
    })
  })

  it('Make sure that Limit cannot be negative', function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="limit_0"]',
          value: '-1'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      message: /New limit for .* should be positive number or 0/
    }).then(function() {
      done()
    })
  })

  it('Add new leave type', function(done) {
    driver
      .findElement(By.css('#add_new_leave_type_btn'))
      .then(function(el) {
        return el.click()
      })
      .then(function() {
        // This is very important line when working with Bootstrap modals!
        driver.sleep(1000)

        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: leave_type_new_form_id + ' input[name="name__new"]',
              value: 'AAAAA'
            },
            {
              selector:
                leave_type_new_form_id + ' input[name="use_allowance__new"]',
              value: 'on',
              tick: true
            }
          ],
          submit_button_selector:
            leave_type_new_form_id + ' button[type="submit"]',
          message: /Changes to leave types were saved/
        }).then(function() {
          done()
        })
      })
  })

  it('Check that new leave type was added at the beginning of the list as it starts with "A"', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'AAAAA'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_2"]',
          value: 'Sick Leave'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('And rename newly added leave type to start with "M"', function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'MM'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/
    }).then(function() {
      done()
    })
  })

  it('Make sure that updated new leave type was moved into second position', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'MM'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_2"]',
          value: 'Sick Leave'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Remove empty newly added leave type', function(done) {
    submit_form_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Sick Leave'
        }
      ],
      submit_button_selector:
        leave_type_edit_form_id +
        ' button[data-tom-leave-type-order="remove_1"]',
      message: /Leave type was successfully removed/
    }).then(function() {
      done()
    })
  })

  it('And make sure only two old leave types are left', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Sick Leave'
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Add AAA and ZZZ leave types', function(done) {
    driver
      .findElement(By.css('#add_new_leave_type_btn'))
      .then(el => el.click())
      // This is very important line when working with Bootstrap modals!
      .then(() => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: leave_type_new_form_id + ' input[name="name__new"]',
              value: 'ZZZ'
            },
            {
              selector:
                leave_type_new_form_id + ' input[name="use_allowance__new"]',
              value: 'on',
              tick: true
            }
          ],
          submit_button_selector:
            leave_type_new_form_id + ' button[type="submit"]',
          message: /Changes to leave types were saved/
        })
      )
      .then(() => driver.findElement(By.css('#add_new_leave_type_btn')))
      .then(el => el.click())
      .then(() => driver.sleep(1000))
      .then(() =>
        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector: leave_type_new_form_id + ' input[name="name__new"]',
              value: 'AAA'
            },
            {
              selector:
                leave_type_new_form_id + ' input[name="use_allowance__new"]',
              value: 'on',
              tick: true
            }
          ],
          submit_button_selector:
            leave_type_new_form_id + ' button[type="submit"]',
          message: /Changes to leave types were saved/
        })
      )
      .then(() => done())
  })

  it('Ensure AAA is first and ZZZ is last in the list (general settings page)', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'AAA'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_2"]',
          value: 'Sick Leave'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_3"]',
          value: 'ZZZ'
        }
      ]
    }).then(() => done())
  })

  it('Ensure AAA is a first and ZZZ is a last in a list on book holiday modal', function(done) {
    driver
      .findElements(By.css('select#leave_type option'))
      .then(options =>
        Bluebird.map(options, option => {
          let option_info = {}
          return option
            .getAttribute('data-tom-index')
            .then(val => Bluebird.resolve((option_info.value = val)))
            .then(() => option.getAttribute('data-tom'))
            .then(txt => Bluebird.resolve((option_info.text = txt)))
            .then(() => Bluebird.resolve(option_info))
        })
      )
      .then(option_infos => {
        expect(option_infos[0], 'AAA is first').to.include({
          value: '0',
          text: 'AAA'
        })
        expect(option_infos[3], 'ZZZ is last').to.include({
          value: '3',
          text: 'ZZZ'
        })
        done()
      })
  })

  it('Mark ZZZ as one to be default one', function(done) {
    driver
      .findElement(
        By.css(
          leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_3"]'
        )
      )
      .then(inp => inp.getAttribute('name'))
      .then(name => Bluebird.resolve(name.split('__')[1]))
      .then(id =>
        submit_form_func({
          driver: driver,
          form_params: [
            {
              selector:
                leave_type_edit_form_id +
                ' input[type="radio"][value="' +
                id +
                '"]',
              tick: true,
              value: 'on'
            }
          ],
          submit_button_selector:
            leave_type_edit_form_id + ' button[type="submit"]',
          message: /Changes to leave types were saved/
        })
      )
      .then(() => done())
  })

  it('Ensure AAA is first and ZZZ is last in the list (general settings page)', function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_0"]',
          value: 'AAA'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_1"]',
          value: 'Holiday'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_2"]',
          value: 'Sick Leave'
        },
        {
          selector:
            leave_type_edit_form_id +
            ' input[data-tom-leave-type-order="name_3"]',
          value: 'ZZZ'
        }
      ]
    }).then(() => done())
  })

  it('Ensure ZZZ is a first and AAA is a second in a list on book holiday modal', function(done) {
    driver
      .findElements(By.css('select#leave_type option'))
      .then(options =>
        Bluebird.map(options, option => {
          let option_info = {}
          return option
            .getAttribute('data-tom-index')
            .then(val => Bluebird.resolve((option_info.value = val)))
            .then(() => option.getAttribute('data-tom'))
            .then(txt => Bluebird.resolve((option_info.text = txt)))
            .then(() => Bluebird.resolve(option_info))
        })
      )
      .then(option_infos => {
        expect(option_infos[0], 'ZZZ is first').to.include({
          value: '0',
          text: 'ZZZ'
        })
        expect(option_infos[1], 'AAA is last').to.include({
          value: '1',
          text: 'AAA'
        })
        done()
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

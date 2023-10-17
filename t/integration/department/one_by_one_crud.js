"use strict"

var test = require("selenium-webdriver/testing"),
  register_new_user_func = require("../../lib/register_new_user"),
  login_user_func = require("../../lib/login_with_user"),
  open_page_func = require("../../lib/open_page"),
  submit_form_func = require("../../lib/submit_form"),
  check_elements_func = require("../../lib/check_elements"),
  By = require("selenium-webdriver").By,
  config = require("../../lib/config"),
  application_host = config.get_application_host(),
  expect = require("chai").expect,
  Bluebird = require("bluebird"),
  add_new_user_func = require("../../lib/add_new_user"),
  user_info_func = require("../../lib/user_info"),
  new_department_form_id = "#add_new_department_form",
  department_edit_form_id = "#department_edit_form"

/*
 *  Scenario:
 *    * register new account
 *    * check that /settings/departments/ page shows readonly list of departments
 *    * ensure that the list of departments has links for every department
 *    ** to edit department
 *    ** see details of its manager
 *    ** there is a link to Bulk department update page
 *    * create new department by pressing "Add new department" button on the /settings/departments/ page
 *    ** ensure that user is landed on department read only list page
 *    ** use A as a name and ensure it appears in the begining of the list
 *    * create another new department starting with "Z"
 *    ** ensure that it is located at the end of the list
 *
 * */

describe("Check departments list page", function() {
  var driver

  this.timeout(config.get_execution_timeout())

  it("Register new account", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      driver = data.driver
      done()
    })
  })

  it("Open page with department list and ensure it has read-only list", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    })
      .then(function() {
        return driver.findElements(
          By.css('tr[data-vpp-department-list-mode="readonly"]')
        )
      })
      .then(function(inputs) {
        expect(inputs.length).to.be.eql(1)
        done()
      })
  })

  it("Ensure list of departments has links for editing each individual one", function(done) {
    driver
      .findElements(By.css('a[href*="/settings/departments/edit/"]'))
      .then(function(links) {
        expect(links.length).to.be.eql(
          2,
          "We expect to have two edit links per department"
        )
        done()
      })
  })

  it("Ensure department has a link to its Manager edit page", function(done) {
    driver
      .findElements(By.css('a[href*="/users/edit/"]'))
      .then(function(links) {
        expect(links.length).to.be.eql(
          1,
          "There exist one link to manager per department"
        )
        return links[0].getAttribute("href")
      })
      .then(function(href) {
        expect(href).to.match(
          /\/users\/edit\/\d+\/$/,
          "Link to manager indeed contains ID"
        )
        done()
      })
  })

  it('Add new "AAA" department', function(done) {
    driver
      .findElement(By.css("#add_new_department_btn"))
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
              selector: new_department_form_id + ' input[name="name__new"]',
              value: "AAA"
            },
            {
              selector:
                new_department_form_id + ' select[name="allowance__new"]',
              option_selector: 'option[value="15"]',
              value: "15"
            }
          ],
          submit_button_selector:
            new_department_form_id + ' button[type="submit"]',
          message: /Changes to departments were saved/
        }).then(function() {
          done()
        })
      })
  })

  it("Ensure that user is landed on department read only list page", function(done) {
    driver.getCurrentUrl().then(function(url) {
      expect(url).to.match(
        /\/settings\/departments\/$/,
        "Ensure the landing page is department list"
      )
      done()
    })
  })

  it("Ensure that newly added department AAA is on top of the list", function(done) {
    driver
      .findElements(By.css('a[data-vpp-department-name="1"]'))
      .then(function(els) {
        return Bluebird.map(els, function(el) {
          return el.getText()
        })
      })
      .then(function(texts) {
        expect(texts).to.have.eql(["AAA", "Sales"], "Check the order of names")
        done()
      })
  })

  it('Add new "ZZZ" department', function(done) {
    driver
      .findElement(By.css("#add_new_department_btn"))
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
              selector: new_department_form_id + ' input[name="name__new"]',
              value: "ZZZ"
            },
            {
              selector:
                new_department_form_id + ' select[name="allowance__new"]',
              option_selector: 'option[value="15"]',
              value: "15"
            }
          ],
          submit_button_selector:
            new_department_form_id + ' button[type="submit"]',
          message: /Changes to departments were saved/
        }).then(function() {
          done()
        })
      })
  })

  it("Ensure that departments respect alphabetical order", function(done) {
    driver
      .findElements(By.css('a[data-vpp-department-name="1"]'))
      .then(function(els) {
        return Bluebird.map(els, function(el) {
          return el.getText()
        })
      })
      .then(function(texts) {
        expect(texts).to.have.eql(
          ["AAA", "Sales", "ZZZ"],
          "Check the order of names"
        )
        done()
      })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

/*
 *  Scenario:
 *    * create new company account
 *    * create additional user B
 *    * go to existing department
 *    * try to edit name, manager - to be user B, allowance to be 5 and tick the "include public holidays" checkbox
 *    * ensure user stays on the department edit oage after changes were saved
 *    * try to remove the department by pressing Delete button on current page
 *    ** ensure that system prevents form doint it complaining that there are people in this department
 *    * create new department and move both users A and B into it
 *
 *    * delete the original department and make sure it is gone
 *    * go to details of newly added department and check the link 'Employees from department'
 *
 * */

describe("Edit individual department via department details page", function() {
  var driver,
    email_A,
    email_B,
    user_id_A,
    user_id_B,
    department_edit_page_url,
    new_department_id

  this.timeout(config.get_execution_timeout())

  it("Register new account", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      email_A = data.email
      driver = data.driver
      done()
    })
  })

  it("Create second user B", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      email_B = data.new_user_email
      done()
    })
  })

  it("Obtain information about user A", function(done) {
    user_info_func({
      driver: driver,
      email: email_A
    }).then(function(data) {
      user_id_A = data.user.id
      done()
    })
  })

  it("Obtain information about user B", function(done) {
    user_info_func({
      driver: driver,
      email: email_B
    }).then(function(data) {
      user_id_B = data.user.id
      done()
    })
  })

  it("Open page with department list and click first department in the list", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    }).then(function() {
      driver
        .findElements(By.css('a[href*="/settings/departments/edit/"]'))
        .then(function(links) {
          return links[0].click()
        })
        .then(function() {
          done()
        })
    })
  })

  it("... save edit page URL", function(done) {
    driver.getCurrentUrl().then(function(url) {
      department_edit_page_url = url
      done()
    })
  })

  it("Edit department", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: department_edit_form_id + ' input[name="name"]',
          value: "Fantastic name"
        },
        {
          selector: department_edit_form_id + ' select[name="allowance"]',
          option_selector: 'option[value="5"]',
          value: "5"
        },
        {
          selector: department_edit_form_id + ' select[name="boss_id"]',
          option_selector: 'option[value="' + user_id_B + '"]',
          value: user_id_B
        },
        {
          selector: 'input[name="include_public_holidays"]',
          tick: true,
          value: "on"
        }
      ],
      submit_button_selector:
        department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/
    }).then(function() {
      done()
    })
  })

  it("Ensure that chnages were applied", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: department_edit_form_id + ' input[name="name"]',
          value: "Fantastic name"
        },
        {
          selector: department_edit_form_id + ' select[name="allowance"]',
          option_selector: 'option[value="5"]',
          value: "5"
        },
        {
          selector: department_edit_form_id + ' select[name="boss_id"]',
          option_selector: 'option[value="' + user_id_B + '"]',
          value: user_id_B + ""
        },
        {
          selector: 'input[name="include_public_holidays"]',
          tick: false,
          value: "off"
        }
      ]
    }).then(function() {
      done()
    })
  })

  it("Ensure that user stays on the same page after updating department details", function(done) {
    driver.getCurrentUrl().then(function(url) {
      expect(url).to.be.eql(department_edit_page_url)
      done()
    })
  })

  it("Try to remove the department by pressing Delete button on current page", function(done) {
    driver
      .findElement(By.css("button#remove_btn"))
      .then(function(btn) {
        return btn.click()
      })
      .then(function() {
        done()
      })
  })

  it("Ensure that system prevents deleting department", function(done) {
    driver
      .findElement(By.css("div.alert"))
      .then(function(el) {
        return el.getText()
      })
      .then(function(txt) {
        expect(txt).to.match(
          /Cannot remove department .+ as it still has 2 users/,
          "App complains about non empty department"
        )
        done()
      })
  })

  it("Go to departments list by clicking on corresponding link", function(done) {
    driver
      .findElement(By.css('a[data-vpp-all-departments-link="1"]'))
      .then(function(link) {
        return link.click()
      })
      .then(function() {
        done()
      })
  })

  it('Add new "AAA" department', function(done) {
    driver
      .findElement(By.css("#add_new_department_btn"))
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
              selector: new_department_form_id + ' input[name="name__new"]',
              value: "AAA"
            },
            {
              selector:
                new_department_form_id + ' select[name="allowance__new"]',
              option_selector: 'option[value="15"]',
              value: "15"
            }
          ],
          submit_button_selector:
            new_department_form_id + ' button[type="submit"]',
          message: /Changes to departments were saved/
        }).then(function() {
          done()
        })
      })
  })

  it("Fetch newly added department ID", function(done) {
    driver
      .findElements(By.css('a[data-vpp-department-name="1"]'))
      // We know that newly added attribute is in the top of the list as it starts with "A"
      .then(function(links) {
        return links[0].getAttribute("href")
      })
      .then(function(href) {
        new_department_id = href.match(
          /settings\/departments\/edit\/(\d+)\//
        )[1]
        expect(new_department_id).to.match(
          /^\d+$/,
          "The department ID is number"
        )
        done()
      })
  })

  it("Open user A details page", function(done) {
    open_page_func({
      url: application_host + "users/edit/" + user_id_A + "/",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("... and move her to newly added department", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: 'select[name="department"]',
          option_selector: 'option[value="' + new_department_id + '"]',
          value: new_department_id
        }
      ],
      submit_button_selector: "button#save_changes_btn",
      message: /Details for .+ were updated/
    }).then(function() {
      done()
    })
  })

  it("Ensure that chnages were applied", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: 'select[name="department"]',
          value: new_department_id
        }
      ]
    }).then(function() {
      done()
    })
  })

  it("Open user B details page", function(done) {
    open_page_func({
      url: application_host + "users/edit/" + user_id_B + "/",
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("... and move her to newly added department", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: 'select[name="department"]',
          option_selector: 'option[value="' + new_department_id + '"]',
          value: new_department_id
        }
      ],
      submit_button_selector: "button#save_changes_btn",
      message: /Details for .+ were updated/
    }).then(function() {
      done()
    })
  })

  it("Ensure that chnages were applied", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: 'select[name="department"]',
          value: new_department_id
        }
      ]
    }).then(function() {
      done()
    })
  })

  it("Go to the very first department details page", function(done) {
    open_page_func({
      url: department_edit_page_url,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("Remove the department by pressing Delete button", function(done) {
    driver
      .findElement(By.css("button#remove_btn"))
      .then(function(btn) {
        return btn.click()
      })
      .then(function() {
        return driver.findElement(By.css("div.alert"))
      })
      .then(function(el) {
        return el.getText()
      })
      .then(function(txt) {
        expect(txt).to.match(/Department was successfully removed/)
        done()
      })
  })

  it("Ensure that we have landed on correct page", function(done) {
    driver.getCurrentUrl().then(function(url) {
      expect(url).to.match(
        /\/settings\/departments\/$/,
        "The URL points to departments page"
      )
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})

/*
 *  Scenario (edditing secondary supervisers)
 *  * create new account with user A
 *  * go to departments details page and invoke "add secondary supervisors"
 *    popup window, ensure it has link to "Add new employee" page
 *  * create two additional users B and C
 *  * go to any department details page and ensure that user A is its manager
 *  * ensure that "secondary supervisors" section is empty
 *  * click "add supervisers" button and ensure that popup witndow
 *    has only user B and C in the list
 *  * tick user B and save changes
 *  * observe that user B appeares on the list of secondary supervisers
 *  * open "add supervisors" pop up again and ensure that user B has tick
 *    next to it and user C does not have it
 *  * tick user C and un-tick user B and save changes
 *  * observe that "secondary spervisors" section now contains only user C
 *  * Click on "Remove" button next to user C and observe that it disappeares
 *    from "secondary supervisors" section after page is reloaded
 *
 * */

describe("CRUD for department secondary supervisers", function() {
  var driver,
    email_A,
    email_B,
    email_C,
    user_id_A,
    user_id_B,
    user_id_C,
    department_edit_page_url

  this.timeout(config.get_execution_timeout())

  it("Register new account", function(done) {
    register_new_user_func({
      application_host: application_host
    }).then(function(data) {
      email_A = data.email
      driver = data.driver
      done()
    })
  })

  it("Obtain information about user A", function(done) {
    user_info_func({
      driver: driver,
      email: email_A
    }).then(function(data) {
      user_id_A = data.user.id
      done()
    })
  })

  it("Go to departments details page", function(done) {
    open_page_func({
      url: application_host + "settings/departments/",
      driver: driver
    }).then(function() {
      driver
        .findElements(By.css('a[href*="/settings/departments/edit/"]'))
        // Click on the very first link as we have just one department
        .then(function(links) {
          return links[0].click()
        })
        .then(function() {
          done()
        })
    })
  })

  it("... save edit page URL", function(done) {
    driver.getCurrentUrl().then(function(url) {
      department_edit_page_url = url
      done()
    })
  })

  it('Invoke "Add secondary supervisers" pop-up window', function(done) {
    driver
      .findElement(By.css('a[data-vpp-add-new-secondary-supervisor="1"]'))
      .then(function(btn) {
        return btn.click()
      })
      .then(function() {
        driver.sleep(1000)
        return driver.findElement(
          By.css('a[data-vpp-add-supervisor-modal-add-new-user="1"]')
        )
      })
      .then(function(link) {
        return link.getText()
      })
      .then(function(text) {
        expect(text).to.match(/Add new employee/)
        done()
      })
  })

  it("Create second user B", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      email_B = data.new_user_email
      done()
    })
  })

  it("Obtain information about user B", function(done) {
    user_info_func({
      driver: driver,
      email: email_B
    }).then(function(data) {
      user_id_B = data.user.id
      done()
    })
  })

  it("Create second user C", function(done) {
    add_new_user_func({
      application_host: application_host,
      driver: driver
    }).then(function(data) {
      email_C = data.new_user_email
      done()
    })
  })

  it("Obtain information about user C", function(done) {
    user_info_func({
      driver: driver,
      email: email_C
    }).then(function(data) {
      user_id_C = data.user.id
      done()
    })
  })

  it("Go to any department details page", function(done) {
    open_page_func({
      url: department_edit_page_url,
      driver: driver
    }).then(function() {
      done()
    })
  })

  it("... and ensure that user A is its manager", function(done) {
    check_elements_func({
      driver: driver,
      elements_to_check: [
        {
          selector: "select#manager_id",
          value: String(user_id_A)
        }
      ]
    }).then(function() {
      done()
    })
  })

  it('Ensure that "secondary supervisors" section is empty', function(done) {
    driver
      .findElements(By.css('button[name="remove_supervisor_id"]'))
      .then(function(els) {
        expect(els.length).to.be.eql(
          0,
          "No remove buttons for supervisers as there are not any"
        )
        done()
      })
  })

  it(
    'click "add supervisers" button and ensure that popup witndow ' +
      "has only user B and C in the list",
    function(done) {
      driver
        .findElement(By.css('a[data-vpp-add-new-secondary-supervisor="1"]'))
        .then(function(btn) {
          return btn.click()
        })
        .then(function() {
          driver.sleep(1000)
          return driver.findElements(By.css('input[name="supervisor_id"]'))
        })
        .then(function(els) {
          return Bluebird.map(els, function(el) {
            return el.getAttribute("value")
          })
        })
        .then(function(vals) {
          expect(vals.sort()).to.be.eql(
            [user_id_B, user_id_C]
              .map(function(e) {
                return String(e)
              })
              .sort(),
            "User list is expected"
          )
          done()
        })
    }
  )

  it("tick user B and save changes", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: 'input[name="supervisor_id"][value="' + user_id_B + '"]',
          tick: true,
          value: "on"
        }
      ],
      submit_button_selector: 'button[name="do_add_supervisors"]',
      message: /Supervisors were added to department/
    }).then(function() {
      done()
    })
  })

  it("Observe that user B appeares on the list of secondary supervisers", function(done) {
    driver
      .findElements(By.css('button[name="remove_supervisor_id"]'))
      .then(function(els) {
        expect(els.length).to.be.eql(
          1,
          "No remove buttons for supervisers as there are not any"
        )
        return els[0].getAttribute("value")
      })
      .then(function(val) {
        expect(val).to.be.eql(String(user_id_B), "It is indeed user B")
        done()
      })
  })

  it('Open "add supervisors" pop up again and ensure that user B has tick next to it and user C does not have it', function(done) {
    driver
      .findElement(By.css('a[data-vpp-add-new-secondary-supervisor="1"]'))
      .then(btn => btn.click())
      .then(() => driver.sleep(1000))
      .then(() =>
        check_elements_func({
          driver: driver,
          elements_to_check: [
            {
              selector: `input[name="supervisor_id"][value="${user_id_B}"]`,
              tick: true,
              value: "on"
            }
          ]
        })
      )
      .then(() =>
        check_elements_func({
          driver: driver,
          elements_to_check: [
            {
              selector: `input[name="supervisor_id"][value="${user_id_C}"]`,
              tick: true,
              value: "off"
            }
          ]
        })
      )
      .then(() => done())
  })

  it("Tick user C and un-tick user B and save changes", function(done) {
    submit_form_func({
      driver: driver,
      form_params: [
        {
          selector: 'input[name="supervisor_id"][value="' + user_id_B + '"]',
          tick: true
        },
        {
          selector: 'input[name="supervisor_id"][value="' + user_id_C + '"]',
          tick: true
        }
      ],
      submit_button_selector: 'button[name="do_add_supervisors"]',
      message: /Supervisors were added to department/
    }).then(() => done())
  })

  it('Observe that "secondary spervisors" section now contains only user C', function(done) {
    driver
      .findElements(By.css('button[name="remove_supervisor_id"]'))
      .then(els => {
        expect(els.length).to.be.eql(
          1,
          "No remove buttons for supervisers as there are not any"
        )
        return els[0].getAttribute("value")
      })
      .then(val => {
        expect(val).to.be.eql(String(user_id_C), "It is indeed user C")
        done()
      })
  })

  it('Click on "Remove" button next to user C and observe that it disappears from "secondary supervisors" section after page is reloaded', function(done) {
    driver
      .findElement(
        By.css(`button[name="remove_supervisor_id"][value="${user_id_C}"]`)
      )
      .then(el => el.click())
      .then(() =>
        driver.findElements(By.css('button[name="remove_supervisor_id"]'))
      )
      .then(els => {
        expect(
          els.length,
          "There is no users in secondary supervisers section"
        ).to.be.eql(0)
        done()
      })
  })

  after(function(done) {
    driver.quit().then(() => done())
  })
})

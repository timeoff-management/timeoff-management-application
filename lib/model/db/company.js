"use strict";

const Promise = require("bluebird"),
  LdapAuth = require("ldapauth-fork"),
  moment = require("moment"),
  moment_tz = require("moment-timezone"),
  _ = require("underscore"),
  uuidv4 = require("uuid/v4");
const { sorter } = require("../../util");

module.exports = function(sequelize, DataTypes) {
  var Company = sequelize.define(
    "Company",
    {
      // TODO add validators!
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false
      },
      start_of_new_year: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      share_all_absences: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_team_view_hidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Determise if Team View is hidden for non-admin users"
      },
      ldap_auth_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ldap_auth_config: {
        type: DataTypes.STRING,
        allowNull: true,
        set: function(val) {
          if (!val || typeof val !== "object") {
            val = JSON.stringify({});
          }
          this.setDataValue("ldap_auth_config", JSON.stringify(val));
        },

        get: function() {
          var val = this.getDataValue("ldap_auth_config");
          try {
            val = JSON.parse(val);
          } catch (err) {
            console.error(
              "Faled to parse the LDAP settings saved in company %s. Error: %s",
              this.id,
              err
            );
            val = {};
          }

          return val;
        }
      },
      date_format: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "YYYY-MM-DD"
      },
      company_wide_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: "Message shown to all users that belong to current company"
      },
      mode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Indicate which mode the company account is in."
      },
      timezone: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "Europe/London",
        comment: "Timezone current company is located in"
      },
      integration_api_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      integration_api_token: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: () => uuidv4(),
        comment: "Indicate which mode the company account is in."
      },
      carry_over: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment:
          "Defines how may remaining days from allowance are carried over to the next year."
      }
    },
    {
      indexes: [
        {
          fields: ["id"]
        }
      ]
    }
  );

  Company.associate = function(models) {
    Company.hasMany(models.Department, {
      as: "departments",
      foreignKey: "company_id"
    });
    Company.hasMany(models.User, {
      as: "users",
      foreignKey: "company_id"
    });
    Company.hasMany(models.BankHoliday, {
      as: "bank_holidays",
      foreignKey: "company_id"
    });
    Company.hasMany(models.LeaveType, {
      as: "leave_types",
      foreignKey: "company_id"
    });
    Company.hasMany(models.EmailAudit, {
      as: "audit_emails",
      foreignKey: "company_id"
    });
    Company.hasMany(models.Audit, {
      as: "audit",
      foreignKey: "company_id"
    });
  };

  Company.loadScope = function(models) {
    Company.addScope("with_all_users", {
      include: [{ model: models.User, as: "users" }]
    });

    Company.addScope("with_audit", {
      include: [{ model: models.Audit, as: "audit" }]
    });

    Company.addScope(
      "with_active_users",
      // The scope needs to be dynamic as the criteria for active users is based
      // on current date, which could be buggy if left static
      function() {
        return {
          include: [
            {
              model: models.User,
              as: "users",
              where: models.User.get_active_user_filter()
            }
          ]
        };
      }
    );

    Company.addScope("order_by_active_users", {
      order: [[{ model: models.User, as: "users" }, "lastname"]]
    });

    Company.addScope("with_simple_departments", {
      include: [{ model: models.Department, as: "departments" }]
    });

    Company.addScope("with_bank_holidays", {
      include: [{ model: models.BankHoliday, as: "bank_holidays" }]
    });

    Company.addScope("order_by_bank_holidays", {
      order: [[{ model: models.BankHoliday, as: "bank_holidays" }, "date"]]
    });

    Company.addScope("with_leave_types", {
      include: [{ model: models.LeaveType, as: "leave_types" }]
    });
  };

  Company.scopeAssociate = function(models) {
    // Following code is here for reference only: to help declaring scopped
    // associations in future. The approach is not suitable for active users
    // bacause of its dynamic nature - we need to have up to date "now", which
    // does not work nicely with accociations as they are installed once at the
    // applicaiton start time, and if the app will be running for more than one
    // day the active users association becomes wrong as it still remember the
    // now as a date when the app was started
    //
    //        Company.hasMany(models.User.scope('active'), {
    //          as         : 'activeUsers',
    //          foreignKey : 'company_id',
    //        });
  };

  // Return code for "read-only holidays" mode of company account.
  // That means company only shows holidays/timeoff for emplyes and
  // does not allow to create new ones.
  //
  Company.get_mode_readonly_holidays = function() {
    return 2;
  };

  // Create new company based on default values
  Company.create_default_company = function(args) {
    var country_code = args.country_code || "UK",
      timezone = args.timezone || "Europe/London";

    // Add new company record
    return (
      Company.create({
        name: args.name || "New company",
        country: country_code,
        start_of_new_year: 1,
        timezone: timezone
      })

        // When new company is created - add default departments to it
        .then(function(company) {
          return Promise.all([
            sequelize.models.Department.create({
              name: "Sales",
              company_id: company.id
            }),
            sequelize.models.BankHoliday.generate_bank_holidays({
              company: company,
              country_code: country_code
            }),
            sequelize.models.LeaveType.generate_leave_types({
              company: company
            })
          ]).then(function() {
            return Promise.resolve(company);
          });
        })
    );
  };

  Company.getCompanyByApiToken = ({ token }) =>
    sequelize.models.Company.scope("with_active_users").findOne({
      where: {
        integration_api_token: token,
        integration_api_enabled: true
      }
    });

  Company.restore_from_dump = args => {
    // The dump JSON object that is about to be imported
    var dump_json = args.dump_json,
      // Dictionary that holds mapping between promary keys from original system
      // and new one
      id_maps = {
        company: {},
        bank_holiday: {},
        leave_type: {},
        department: {},
        user: {}
      };

    // Make sure that emails that are about to be migrated do not exist
    // withing current database
    return (
      sequelize.models.User.findAll({
        where: {
          email: {
            $in: _.map(dump_json.users, function(u) {
              return u.email;
            })
          }
        }
      })
        .then(function(users) {
          if (users.length > 0) {
            throw new Error(
              "Users with following emails already exist in the system: " +
                _.map(users, function(u) {
                  return u.email;
                }).join(", ")
            );
          }

          return sequelize.models.Company.describe();
        })

        // Instert company
        .then(function(company_definition) {
          var company_json = _.omit(dump_json, function(value, key, object) {
            return !(company_definition.hasOwnProperty(key) && key !== "id");
          });

          return sequelize.models.Company.create(company_json).then(function(
            company
          ) {
            id_maps.company[dump_json.id] = company.id;
            return Promise.resolve(1);
          });
        })

        // Instert bank holidays and Leave types
        //
        .then(function() {
          return Promise.join(
            promise_to_restore_bank_holidays({
              dump_json: dump_json,
              id_maps: id_maps,
              model: sequelize.models
            }),
            promise_to_restore_leave_types({
              dump_json: dump_json,
              id_maps: id_maps,
              model: sequelize.models
            }),
            function() {
              return Promise.resolve(1);
            }
          );
        })

        // Insert departments
        //
        .then(function() {
          return promise_to_restore_departments({
            dump_json: dump_json,
            id_maps: id_maps,
            model: sequelize.models
          });
        })

        // insert users
        //
        .then(function() {
          return promise_to_restore_users({
            dump_json: dump_json,
            id_maps: id_maps,
            model: sequelize.models
          });
        })

        // Update departments with correct user IDs for supervisor
        //
        .then(function() {
          return Promise.all(
            _.map(_.values(id_maps.department), function(department_id) {
              return sequelize.models.Department.find({
                where: { id: department_id }
              });
            })
          ).then(function(departments_to_update) {
            return Promise.all(
              _.map(departments_to_update, function(department) {
                department.bossId = id_maps.user[department.bossId];
                return department.save();
              })
            );
          });
        })

        // insert leaves
        .then(function() {
          return promise_to_restore_leaves({
            dump_json: dump_json,
            id_maps: id_maps,
            model: sequelize.models
          });
        })
    );
  }; // End of restore_from_dump

  /*
   * Return name suitable to use for precessing by machines,
   * actually it just remove spaces and replace them with "_"
   *
   * */
  Company.prototype.name_for_machine = function() {
    return this.name.replace(/\s+/g, "_");
  };

  Company.prototype.reload_with_bank_holidays = function() {
    var self = this;

    return self.getBank_holidays().then(function(bank_holidays) {
      self.bank_holidays = bank_holidays;

      return Promise.resolve(self);
    });
  };

  Company.prototype.get_ldap_server = function() {
    var config = this.get("ldap_auth_config");
    var tlsOptions = config.allow_unauthorized_cert
      ? { rejectUnauthorized: false }
      : {};

    // defaults
    if (!config.searchfilter) config.searchfilter = "(mail={{username}})";
    // When testing consider using TEST LDAP server
    // http://www.forumsys.com/en/tutorials/integration-how-to/ldap/online-ldap-test-server/
    var ldap = new LdapAuth({
      url: config.url,
      bindDn: config.binddn,
      bindCredentials: config.bindcredentials,
      searchBase: config.searchbase,
      searchFilter: config.searchfilter,
      cache: false,
      tlsOptions: tlsOptions
    });

    return ldap;
  };

  Company.prototype.get_moment_to_datepicker_map = function() {
    return {
      "YYYY-MM-DD": "yyyy-mm-dd",
      "YYYY/MM/DD": "yyyy/mm/dd",
      "DD MMM, YY": "dd M, yy",
      "DD/MM/YY": "dd/mm/yy",
      "DD/MM/YYYY": "dd/mm/yyyy",
      "MM/DD/YY": "mm/dd/yy"
    };
  };

  Company.prototype.get_default_date_format = function() {
    return this.getDataValue("date_format");
  };

  Company.prototype.get_available_date_formats = function() {
    var obj = this.get_moment_to_datepicker_map();
    return _.keys(obj);
  };

  Company.prototype.get_default_date_format_for_date_picker = function() {
    var self = this;

    var moment_to_datepicker_map = self.get_moment_to_datepicker_map();

    if (
      moment_to_datepicker_map.hasOwnProperty(self.get_default_date_format())
    ) {
      return moment_to_datepicker_map[self.get_default_date_format()];
    }

    return "yyyy-mm-dd";
  };

  // Takes date string in format specific for current company and produce string
  // with date in generic format used internally within application
  Company.prototype.normalise_date = function(date_str) {
    return moment
      .utc(date_str, this.get_default_date_format())
      .format("YYYY-MM-DD");
  };

  // Returns moment UTC-ed object that takes into consideration company time zone
  // (p to day's precision)
  Company.prototype.get_today = function() {
    let self = this;

    return moment.utc(
      moment_tz
        .utc()
        .tz(self.timezone)
        .format("YYYY-MM-DD")
    );
  };

  Company.prototype.regenerateIntegrationApiToken = function() {
    const self = this;

    self.set("integration_api_token", uuidv4());

    return self.save();
  };

  // Promise schedule object valid for current company, if it does not have such
  // in databse, retulr default one
  Company.prototype.promise_schedule = function() {
    var self = this;

    return self.sequelize.models.Schedule.findOne({
      where: { company_id: self.id }
    }).then(function(schedule) {
      if (schedule) {
        return Promise.resolve(schedule);
      }

      return self.sequelize.models.Schedule.promise_to_build_default_for({
        company_id: self.id
      });
    });
  };

  // Return TRUE if company has restrictio on ly to show hollidays for its
  // employees and prevent them from adding new ones
  //
  Company.prototype.is_mode_readonly_holidays = function() {
    return this.mode === Company.get_mode_readonly_holidays();
  };

  Company.prototype.getSortedLeaveTypes = function() {
    const self = this;

    const leaveTypes = self.leave_types || [];

    return leaveTypes.sort((a, b) => sorter(a.name, b.name));
  };

  return Company;
};

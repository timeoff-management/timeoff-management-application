"use strict";

var Promise   = require("bluebird"),
    LdapAuth  = require('ldapauth-fork'),
    moment    = require('moment'),
    _         = require('underscore');

module.exports = function(sequelize, DataTypes) {
  var Company = sequelize.define("Company", {
    // TODO add validators!
    name : {
      type      : DataTypes.STRING,
      allowNull : false
    },
    country : {
      type      : DataTypes.STRING,
      allowNull : false
    },
    start_of_new_year : {
      type      : DataTypes.INTEGER,
      allowNull : false
    },
    share_all_absences : {
        type         : DataTypes.BOOLEAN,
        allowNull    : false,
        defaultValue : false,
    },
    ldap_auth_enabled : {
        type         : DataTypes.BOOLEAN,
        allowNull    : false,
        defaultValue : false,
    },
    ldap_auth_config : {
        type      : DataTypes.STRING,
        allowNull : true,
        set : function(val){
          if (! val || typeof val !== 'object'  ) {
            val = JSON.stringify({});
          }
          this.setDataValue( 'ldap_auth_config', JSON.stringify(val) );
        },

        get : function(){
          var val = this.getDataValue('ldap_auth_config');
          try {
            val = JSON.parse(val);
          } catch(err) {
            console.error(
              'Faled to parse the LDAP settings saved in company %s. Error: %s',
              this.id, err
            );
            val = {};
          }

          return val;
        },
    },
    date_format : {
      type         : DataTypes.STRING,
      allowNull    : false,
      defaultValue : 'YYYY-MM-DD',
    },
  }, {

    indexes : [
      {
        fields : ['id'],
      }
    ],

    classMethods: {

      associate : function( models ) {
          Company.hasMany(models.Department, {
            as         : 'departments',
            foreignKey : 'companyId',
          });
          Company.hasMany(models.User, {
            as         : 'users',
            foreignKey : 'companyId',
          });
          Company.hasMany(models.BankHoliday, {
            as         : 'bank_holidays',
            foreignKey : 'companyId',
          });
          Company.hasMany(models.LeaveType, {
            as         : 'leave_types',
            foreignKey : 'companyId',
          });
          Company.hasMany(models.EmailAudit, {
            as         : 'audit_emails',
            foreignKey : 'company_id',
          });
      },

      // Create new company based on default values
      create_default_company : function(args){
        var country_code = args.country_code || 'UK';

        // Add new company record
        return Company.create({
            name              : args.name || 'New company',
            country           : country_code,
            start_of_new_year : 1,
        })

        // When new company is created - add default departments to it
        .then(function(company){

            return Promise.all([
                sequelize.models.Department
                    .create({
                        name      : 'Sales',
                        companyId : company.id,
                    }),
                sequelize.models.BankHoliday
                    .generate_bank_holidays({
                      company      : company,
                      country_code : country_code,
                    }),
                sequelize.models.LeaveType
                    .generate_leave_types({ company : company })
            ])
            .then(function(){

                return Promise.resolve(company);
            });
        });

      },

      restore_from_dump : function(args){

        // The dump JSON object that is about to be imported
        var dump_json = args.dump_json,

        // Dictionary that holds mapping between promary keys from original system
        // and new one
        id_maps = {
          company      : {},
          bank_holiday : {},
          leave_type   : {},
          department   : {},
          user         : {},
        };

        // Make sure that emails that are about to be migrated do not exist
        // withing current database
        return sequelize.models.User.findAll({
          where : {
            email : { "$in" : _.map(dump_json.users, function(u){ return u.email; }) }
          }
        })
        .then(function(users){
          if (users.length > 0) {
            throw new Error(
              'Users with following emails already exist in the system: '
                + _.map(users, function(u){return u.email}).join(', ')
            );
          }

          return sequelize.models.Company.describe()
        })

        // Instert company
        .then(function(company_definition){

          var company_json = _.omit(dump_json, function(value, key, object){
            return ! (company_definition.hasOwnProperty(key) && key !== 'id');
          });

          return sequelize.models.Company.create(company_json)
            .then(function(company){
              id_maps.company[dump_json.id] = company.id;
              return Promise.resolve(1);
            });
        })

        // Instert bank holidays and Leave types
        //
        .then(function(){
          return Promise.join(
            promise_to_restore_bank_holidays({
              dump_json : dump_json,
              id_maps   : id_maps,
              model     : sequelize.models,
            }),
            promise_to_restore_leave_types({
              dump_json : dump_json,
              id_maps   : id_maps,
              model     : sequelize.models,
            }),
            function(){return Promise.resolve(1);}
          );
        })

        // Insert departments
        //
        .then(function(){
          return promise_to_restore_departments({
            dump_json : dump_json,
            id_maps   : id_maps,
            model     : sequelize.models,
          });
        })

        // insert users
        //
        .then(function(){
          return promise_to_restore_users({
            dump_json : dump_json,
            id_maps   : id_maps,
            model     : sequelize.models,
          });
        })

        // Update departments with correct user IDs for superviser
        //
        .then(function(){
          return Promise.all(
            _.map(_.values( id_maps.department ), function(department_id){
              return sequelize.models.Department
                .find({ where : {id : department_id} });
            })
          )
          .then(function(departments_to_update){
            return Promise.all(
              _.map(departments_to_update, function(department){
                department.bossId = id_maps.user[ department.bossId ];
                return department.save();
              })
            );
          });
        })

        // insert leaves
        .then(function(){
          return promise_to_restore_leaves({
            dump_json : dump_json,
            id_maps   : id_maps,
            model     : sequelize.models,
          });
        })
      }, // End of restore_from_dump
    },

    instanceMethods : {
      /*
       * Return name suitable to use for precessing by machines,
       * actually it just remove spaces and replace them with "_"
       *
       * */
      name_for_machine : function(){
        return this.name.replace(/\s+/, '_');
      },

      reload_with_bank_holidays : function(){
        var self = this;

        return self.getBank_holidays()
          .then(function(bank_holidays){
            self.bank_holidays = bank_holidays;

            return Promise.resolve(self);
          });
      },

      get_ldap_server : function(){

        var config = this.get('ldap_auth_config');

        // When testing consider using TEST LDAP server
        // http://www.forumsys.com/en/tutorials/integration-how-to/ldap/online-ldap-test-server/
        var ldap = new LdapAuth({
          url             : config.url,
          bindDn          : config.binddn,
          bindCredentials : config.bindcredentials,
          searchBase      : config.searchbase,
          searchFilter    : '(mail={{username}})',
          cache           : false,
        });

        return ldap;
      },

      get_moment_to_datepicker_map : function() {
        return {
          "YYYY-MM-DD" : 'yyyy-mm-dd',
          "YYYY/MM/DD" : 'yyyy/mm/dd',
          "DD MMM, YY" : 'dd M, yy',
          "DD/MM/YY"   : "dd/mm/yy",
          "DD/MM/YYYY" : "dd/mm/yyyy",
          "MM/DD/YY"   : 'mm/dd/yy',
        };
      },

      get_default_date_format : function() {
        return this.getDataValue('date_format');
      },

      get_available_date_formats : function() {
        var obj = this.get_moment_to_datepicker_map();
        return _.keys( obj );
      },

      get_default_date_format_for_date_picker : function() {
        var self = this;

        var moment_to_datepicker_map = self.get_moment_to_datepicker_map();

        if ( moment_to_datepicker_map.hasOwnProperty( self.get_default_date_format() ) ) {
          return moment_to_datepicker_map[ self.get_default_date_format() ];
        }

        return 'yyyy-mm-dd';
      },

      // Takes date string in format specific for current company and produce string
      // with date in generic format used internally within application
      normalise_date : function(date_str) {
        return moment(date_str, this.get_default_date_format()).format('YYYY-MM-DD');
      },

      // Promise schedule object valid for current company, if it does not have such
      // in databse, retulr default one
      promise_schedule : function(){
        var self = this;

        return self.sequelize.models.Schedule
          .findOne({
            where : { company_id : self.id },
          })
          .then(function(schedule){

            if ( schedule) {
              return Promise.resolve( schedule );
            }

            return self.sequelize.models.Schedule
              .promise_to_build_default_for({ company_id : self.id });
          });
      },

    }
  });

  return Company;
};


function promise_to_restore_bank_holidays(args){
  var dump_json = args.dump_json,
      model = args.model,
      id_maps = args.id_maps;

  return model.BankHoliday.describe()
    .then(function(bank_holiday_definition){
      // get array of JSON for each bank holiday
      var bank_holiday_json = _.map(dump_json.bank_holidays,function(rec){
        var json = _.omit(rec, function(v,k,o){
          return ! bank_holiday_definition.hasOwnProperty(k);
        });
        // substitude company IDs with fresh ones
        json.companyId = id_maps.company[ json.companyId ];
        return json;
      });

      return Promise.all(_.map(bank_holiday_json, function(json){
        var old_id = json.id;
        delete json.id;

        return model.BankHoliday.create(json)
          .then(function(bh){
            id_maps.bank_holiday[ old_id ] = bh.id;
            return Promise.resolve(1);
          });
      }));
    });
};


function promise_to_restore_leave_types(args){
  var dump_json = args.dump_json,
      model = args.model,
      id_maps = args.id_maps;

  return model.LeaveType.describe()
    .then(function(leave_type_definition){
      var leave_type_json = _.map(dump_json.leave_types,function(rec){
        var json = _.omit(rec, function(v,k,o){
          return ! leave_type_definition.hasOwnProperty(k);
        });
        // substitude company IDs with fresh ones
        json.companyId = id_maps.company[ json.companyId ];
        return json;
      });

      return Promise.all(_.map(leave_type_json, function(json){
        var old_id = json.id;
        delete json.id;

        return model.LeaveType.create(json)
          .then(function(lt){
            id_maps.leave_type[ old_id ] = lt.id;
            return Promise.resolve(1);
          });
      }));

    });
};

function promise_to_restore_departments (args){
  var dump_json = args.dump_json,
      model = args.model,
      id_maps = args.id_maps;

  return model.Department.describe()
    .then(function(department_definition){
      var department_json = _.map(dump_json.departments,function(rec){
        var json = _.omit(rec, function(v,k,o){
          return ! department_definition.hasOwnProperty(k);
        });

        // substitude company IDs with fresh ones
        json.companyId = id_maps.company[ json.companyId ];

        return json;
      });

      return Promise.all(_.map(department_json, function(json){
        var old_id = json.id;
        delete json.id;

        return model.Department.create(json)
          .then(function(d){
            id_maps.department[ old_id ] = d.id;
            return Promise.resolve(1);
          });
      }));

    });
};

function promise_to_restore_users(args) {
  var dump_json = args.dump_json,
      model = args.model,
      id_maps = args.id_maps;

  return model.User.describe()
    .then(function(user_definition){
      var user_json = _.map(dump_json.users, function(rec){
        var json = _.omit(rec, function(v,k,o){
          return ! user_definition.hasOwnProperty(k);
        });

        // substitude company IDs with fresh ones
        json.companyId = id_maps.company[ json.companyId ];

        // replace department ID with fresh one
        json.DepartmentId = id_maps.department[ json.DepartmentId ];

        // replace password hash
        json.password = model.User.hashify_password('changeme');

        return json;
      });

      return Promise.all(_.map(user_json, function(json){
        var old_id = json.id;
        delete json.id;

        return model.User.create(json)
          .then(function(u){
            id_maps.user[ old_id ] = u.id;
            return Promise.resolve(1);
          });
      }));

    });
};

function promise_to_restore_leaves(args){
  var dump_json = args.dump_json,
      model = args.model,
      id_maps = args.id_maps;

  return model.Leave.describe()
    .then(function(leave_definition){
      var leave_json = _.map(
        _.flatten(
          _.map(dump_json.users, function(u){ return u.my_leaves; }),
          true
        ),
        function(rec){
          var json = _.omit(rec, function(v,k,o){
            return ! leave_definition.hasOwnProperty(k);
          });

          // replace approver ID with fresh one
          json.approverId = id_maps.user[ json.approverId ];

          // replace user ID with fresh one
          json.userId = id_maps.user[ json.userId ];

          // replace leave type ID with fresh one
          json.leaveTypeId = id_maps.leave_type[ json.leaveTypeId ];

          return json;
        }
      );

      return Promise.all(_.map(leave_json, function(json){
        var old_id = json.id;
        delete json.id;

        return model.Leave.create(json);
      }));
    });
};

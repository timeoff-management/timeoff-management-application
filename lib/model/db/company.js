"use strict";

var Promise   = require("bluebird"),
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
      },

      // Create new company based on default values
      create_default_company : function(args){

          // Add new company record
          return Company.create({
              name              : args.name || 'New company',
              country           : 'UK',
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
                      .generate_bank_holidays({ company : company }),
                  sequelize.models.LeaveType
                      .generate_leave_types({ company : company })
              ])
              .then(function(){

                  return Promise.resolve(company);
              });
          });

        },

        restore_from_dump : function(args){
          var dump_json = args.dump_json,
            id_maps = {
              company : {},
              bank_holiday : {},
              leave_type : {},
            };

          var promise_to_restore_bank_holidays = function(){
            return sequelize.models.BankHoliday.describe()
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

                  return sequelize.models.BankHoliday.create(json)
                    .then(function(bh){
                      id_maps.bank_holiday[ old_id ] = bh.id;
                      return Promise.resolve(1);
                    });
                }));
              });
          };

          var promise_to_restore_leave_types = function(){
            return sequelize.models.LeaveType.describe()
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

                  return sequelize.models.LeaveType.create(json)
                    .then(function(lt){
                      id_maps.leave_type[ old_id ] = lt.id;
                      return Promise.resolve(1);
                    });
                }));

              });
          };

          // Instert company
          return sequelize.models.Company.describe()
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
                promise_to_restore_bank_holidays(),
                promise_to_restore_leave_types(),
                function(){return Promise.resolve(1);}
              );
            })

          // Insert departments
          //
          // insert users
          //
          // insert leaves
          //
          // update departments with correct user ids

//          return sequelize.models.Company.create(dump_json);
//          return sequelize.models.Company.describe()
//            .then(function(o){
//              console.log('>>>> ' + JSON.stringify(o) );
//              return Promise.resolve(1);
//            });
        },
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
    }
  });

  return Company;
};

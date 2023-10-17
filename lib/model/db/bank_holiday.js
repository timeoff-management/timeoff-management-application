"use strict";

var moment = require("moment"),
  _ = require("underscore"),
  config = require("../../config");

module.exports = function(sequelize, DataTypes) {
  var BankHoliday = sequelize.define(
    "BankHoliday",
    {
      // TODO add validators!
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      indexes: [
        {
          fields: ["companyId"]
        }
      ]
    }
  );

  Object.assign(BankHoliday, {
    associate: function(models) {
      BankHoliday.belongsTo(models.Company, { as: "company" });
    },

    generate_bank_holidays: function(args) {
      var company = args.company,
        country_code = args.country_code;

      var bank_holidays = [
        {
          name: "Early May bank holiday",
          date: "2015-05-04",
          companyId: company.id
        }
      ];

      var config_countries = config.get("countries");

      if (
        config_countries.hasOwnProperty(country_code) &&
        config_countries[country_code].hasOwnProperty("bank_holidays") &&
        config_countries[country_code].bank_holidays.length > 0
      ) {
        bank_holidays = _.map(
          config_countries[country_code].bank_holidays,
          function(bh) {
            return {
              name: bh.name,
              date: bh.date,
              companyId: company.id
            };
          }
        );
      }

      return BankHoliday.bulkCreate(bank_holidays);
    }
  });
  Object.assign(BankHoliday.prototype, {
    get_pretty_date: function() {
      return moment.utc(this.date).format("YYYY-MM-DD");
    }
  });

  return BankHoliday;
};

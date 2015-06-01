"use strict";

var moment = require('moment');

module.exports = function(sequelize, DataTypes) {
    var BankHoliday = sequelize.define("BankHoliday", {
        // TODO add validators!
        name : {
            type      : DataTypes.STRING,
            allowNull : false
        },
        date : {
            type         : DataTypes.DATE,
            allowNull    : false,
        },
    }, {
        classMethods: {
            associate : function( models ) {
                BankHoliday.belongsTo(models.Company, {as : 'company'});
            },

            generate_bank_holidays : function(args){
                var company = args.company;

                return BankHoliday.bulkCreate([
                    {
                        name : 'Early May bank holiday',
                        date : '2015-05-04',
                        companyId : company.id,
                    },
                ])
            },
        },

        instanceMethods : {
          get_pretty_date : function(){
            return moment(this.date).format('YYYY-MM-DD');
          },
        }
    });

    return BankHoliday;
};

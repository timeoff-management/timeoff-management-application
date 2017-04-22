
'use strict';

var moment  = require('moment'),
    Promise = require("bluebird");

function works_whole_day() { return 1 }
function works_none()      { return 2 }
function works_morning()   { return 3 }
function works_afternoon() { return 4 }

module.exports = function(sequelize, DataTypes){

  var Schedule = sequelize.define("Schedule", {
    monday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_whole_day(),
    },
    tuesday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_whole_day(),
    },
    wednesday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_whole_day(),
    },
    thursday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_whole_day(),
    },
    friday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_whole_day(),
    },
    saturday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_none(),
    },
    sunday : {
      type         : DataTypes.INTEGER,
      allowNull    : false,
      defaultValue : works_none(),
    },
  },{

    underscored     : true,
    freezeTableName : true,
    tableName       : 'schedule',

    indexes : [
      { fields : ['user_id'] },
      { fields : ['company_id'] },
    ],

    classMethods: {
      associate : function( models ) {
        Schedule.belongsTo(models.Company, {as : 'company', foreignKey : 'company_id'});
        Schedule.belongsTo(models.User, {as : 'user', foreignKey : 'user_id'});
      },

      promise_to_build_default_for : function(args){
        var company_id = args.company_id,
            user_id = args.user_id;

        if ( ! company_id && ! user_id ) {
          throw new Error('Needs to have either company_id or user_id');
        }

        var default_schedule = sequelize.models.Schedule.build({
          comapny_id : company_id,
          user_id    : user_id,
        });

        return Promise.resolve(default_schedule);
      },
    },

    validate : {
      relatesToEitherUserOrCompanyButNotBoth : function(){
        if ( this.company_id !== null && this.user_id !== null ) {
          throw new Error('Schedule should be connected either to company of to user but not to both');
        }
      },

      relatesToUserOrCompany : function(){
        if ( this.company_id === null && this.user_id === null){
          throw new Error('Schedule needs to be related to eaither company or user');
        }
      },
    },

    instanceMethods : {
      is_user_specific : function() {
        return this.user_id !== null;
      },

      is_it_working_day : function(args){
        var day = args.day;

        if ( ! day ) {
          throw new Error('"is_it_working_day" requires to have "day" parameter');
        }

        return this[ moment(day).format('dddd').toLowerCase() ] === works_whole_day();
      },
    },
  });

  return Schedule;
};

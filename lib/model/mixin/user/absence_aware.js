
/*
 * Mixin that inject to user model object consumer set of methods necessary for
 * dealing with abcenses.
 *
 * */

'use strict';

var
    _             = require('underscore'),
    Promise       = require("bluebird"),
    CalendarMonth = require('../../calendar_month'),
    moment        = require('moment');

module.exports = function(sequelize){

  this.promise_calendar = function(args) {
    var year  = args.year || moment(),
    model     = sequelize.models,
    this_user = this;

    return Promise.join(

      Promise.try(function(){
        return this_user.getDepartment();
      }),

      Promise.try(function(){
        return this_user.getCompany({
          include:[
            { model : model.BankHoliday, as : 'bank_holidays' },
            { model : model.LeaveType, as : 'leave_types' },
          ]
        });
      }),

      Promise.try(function(){
        return this_user.getMy_leaves({
          where : {
            status : { $ne : sequelize.models.Leave.status_rejected()},
            $or : {
              date_start : {
                $between : [
                  moment().startOf('year').format('YYYY-MM-DD'),
                  moment().endOf('year').format('YYYY-MM-DD'),
                ]
              },
              date_end : {
                $between : [
                  moment().startOf('year').format('YYYY-MM-DD'),
                  moment().endOf('year').format('YYYY-MM-DD'),
                ]
              }
            }
          },
//          include : [{
//            model : model.LeaveDay,
//            as    : 'days',
//            where : {
//              date : {
//                $between : [
//                  moment(year).startOf('year').format('YYYY-MM-DD'),
//                  moment(year).endOf('year').format('YYYY-MM-DD'),
//                ],
//               },
//            },
//          }],
        });
      }),

      function(department, company, leaves){
        var leave_days = _.flatten( _.map(leaves, function(leave){
          return _.map( leave.get_days(), function(leave_day){
            leave_day.leave = leave;
            return leave_day;
          });
        }));

        return Promise.resolve(
          _.map([1,2,3,4,5,6,7,8,9,10,11,12],function(i){
            return new CalendarMonth(
              moment(year).format('YYYY')+'-'+i+'-01',
              {
                bank_holidays :
                  department.include_public_holidays
                  ?  _.map(
                    company.bank_holidays,
                    function(day){return day.date}
                  )
                  : [],
                leave_days : leave_days,
              }
            );
          })
        );
      }

    ); // End of join
  };


  this.validate_overlapping = function(new_leave_attributes) {
    var this_user = this;

    var days_filter = {
      $between : [
        new_leave_attributes.from_date,
        moment(new_leave_attributes.to_date)
          .add(1,'days').format('YYYY-MM-DD'),
      ],
    };

    return this_user.getMy_leaves({
      where : {
        status : { $ne : sequelize.models.Leave.status_rejected()},

        $or : {
          date_start : days_filter,
          date_end : days_filter,
        },
      },
//      include : [{
//        model : sequelize.models.LeaveDay,
//        as : 'days',
//        where : {
//          'date' : {
//            $between : [
//              new_leave_attributes.from_date,
//              moment(new_leave_attributes.to_date)
//                .add(1,'days').format('YYYY-MM-DD'),
//            ]
//          }
//        }
//      }],
//      order : [
//        [
//          {
//            model : sequelize.models.LeaveDay,
//            as : 'days'
//          },
//          'date'
//        ]
//      ],
    })

    .then(function(overlapping_leaves){

      // Check there are overlapping leaves
      if (overlapping_leaves.length === 0){
          return Promise.resolve(1);
      }

      var overlapping_leave = overlapping_leaves[0];

      if (overlapping_leave.fit_with_leave_request(
            new_leave_attributes
      )){
          return Promise.resolve(1);
      }

      // Otherwise it is overlapping!
      var error = new Error('Overlapping booking!');
      error.user_message = 'Overlapping booking!';
      throw error;

    });
  }; // end of validate_overlapping


  // Promise all leaves requested by current user, regardless
  // their statuses
  //
  this.promise_my_leaves = function(args){

    var where_clause = {},
        year         = args.year || moment();

    if (args && args.filter_status) {
      where_clause = { status : args.filter_status };
    }


    where_clause['$or'] = {
      date_start : {
        $between : [
          moment().startOf('year').format('YYYY-MM-DD'),
          moment().endOf('year').format('YYYY-MM-DD'),
        ]
      },
      date_end : {
        $between : [
          moment().startOf('year').format('YYYY-MM-DD'),
          moment().endOf('year').format('YYYY-MM-DD'),
        ]
      }
    };

    return this.getMy_leaves({
      include : [
      {
//        model : sequelize.models.LeaveDay,
//        as    : 'days',
//        where : {
//          date : {
//            $between : [
//              moment(year).startOf('year').format('YYYY-MM-DD'),
//              moment(year).endOf('year').format('YYYY-MM-DD'),
//            ],
//           },
//        },
//      },{
        model : sequelize.models.LeaveType,
        as    : 'leave_type',
      },{
        model : sequelize.models.User,
        as    : 'approver',
        include : [{
          model : sequelize.models.Company,
          as : 'company',
          include : [{
            model : sequelize.models.BankHoliday,
            as : 'bank_holidays',
          }],
        }],
      }],
      where : where_clause,
//      order : [[
//        {model : sequelize.models.LeaveDay, as : 'days'},
//        sequelize.models.LeaveDay.default_order_field()
//      ]],
    });
  };


  this.promise_my_active_leaves = function(args) {
    var year = args.year || moment();

    return this.promise_my_leaves({
      year          : year,
      filter_status : [
        sequelize.models.Leave.status_approved(),
        sequelize.models.Leave.status_new(),
        sequelize.models.Leave.status_pended_revoke(),
      ],
    });
  };


  // Promise leaves that are needed to be Approved/Rejected
  //
  this.promise_leaves_to_be_processed = function(){
    return this.getSupervised_leaves({
      include : [
      {
//        model : sequelize.models.LeaveDay,
//        as    : 'days',
//      },{
        model : sequelize.models.LeaveType,
        as    : 'leave_type',
      },{
        model : sequelize.models.User,
        as    : 'user',
        include : [{
          model : sequelize.models.Company,
          as : 'company',
          include : [{
            model : sequelize.models.BankHoliday,
            as    : 'bank_holidays',
          }],
        },{
          model : sequelize.models.Department,
          as    : 'department',
        }],
      }],
      where : {
        status : [
          sequelize.models.Leave.status_new(),
          sequelize.models.Leave.status_pended_revoke()
        ]
      },
//      order : [[
//          {model : sequelize.models.LeaveDay, as : 'days'},
//          sequelize.models.LeaveDay.default_order_field()
//      ]],
    });
  }; // END of promise_leaves_to_be_processed


  this.calculate_number_of_days_taken_from_allowence = function(){
    return _.reduce(
      _.map(
        _.filter(
          this.my_leaves,
          function (leave){ return leave.is_approved_leave() }
        ),
        function(leave){ return leave.get_deducted_days_number() }
      ),
      function(memo, num){ return memo + num },
      0
    ) || 0;
  };


  this.get_automatic_adjustment = function(args) {

    var now = (args && args.now) ? moment(args.now) : moment();

    if (
      now.year() !== moment(this.start_date).year()
      && ( ! this.end_date || moment(this.end_date).year() > now.year() )
    ){
        return 0;
    }

    var start_date = moment(this.start_date).year() === now.year()
      ? moment(this.start_date)
      : now.startOf('year'),
    end_date = this.end_date && moment(this.end_date).year() <= now.year()
      ? moment(this.end_date)
      : moment().endOf('year');

    return -1*(this.department.allowence - Math.round(
      this.department.allowence * end_date.diff(start_date, 'days') / 365
    ));
  };


  this.calculate_total_number_of_days_n_allowence = function(year) {

    // If optional paramater year was provided we need to calculate allowance
    // for that year, and if it is something other then current year,
    // adjustment should be made, return nominal setting from department
    if (year && year != moment().year()) {
      return this.department.allowence
    }

    // Get general allowence based on department
    return this.department.allowence
      + this.get_automatic_adjustment()
      // Adjust it based on current user
      + this.adjustment;
  };


  this.promise_my_leaves_for_calendar = function(args){
    var year = args.year || moment();

    return this.getMy_leaves({
      where : {
        status : { $ne : sequelize.models.Leave.status_rejected()},

        $or : {
          date_start : {
            $between : [
              moment().startOf('year').format('YYYY-MM-DD'),
              moment().endOf('year').format('YYYY-MM-DD'),
            ]
          },
          date_end : {
            $between : [
              moment().startOf('year').format('YYYY-MM-DD'),
              moment().endOf('year').format('YYYY-MM-DD'),
            ]
          }
        }
      },
//      include : [{
//        model : sequelize.models.LeaveDay,
//        as    : 'days',
//        where : {
//          date : {
//            $between : [
//              moment(year).startOf('year').format('YYYY-MM-DD'),
//              moment(year).endOf('year').format('YYYY-MM-DD'),
//            ],
//           },
//        },
//      }],
    }); // End of MyLeaves
  };

};


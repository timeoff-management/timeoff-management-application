
/*
 * This is a role to be applied to user model that injects getters necessary
 * for fetching related company object with different level of details.
 *
 * Well.. to be precise that role is applied to the object that is used as
 * a spec for instance method for User objects.
 *
 * */

'use strict';

var
  moment = require('moment');

module.exports = function(sequelize){

  /* Fetch company object associated with current user, the company object
   * includes all necessary associations for building user detail page
   * for user determined by user_id.
   * Returns promise that is resolved with company object as parameter
   */
  this.get_company_for_user_details = function(args){
    var user_id    = args.user_id,
      year         = args.year || moment(),
      current_user = this;

    return this.getCompany({
      include : [
        {
          model : sequelize.models.User,
          as    : 'users',
          where : { id : user_id },
          include : [

            // Following is needed to be able to calculate how many days were
            // taked from allowence
            {
              model   : sequelize.models.Leave,
              as      : 'my_leaves',
              required : false,
              where : {
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
              include : [
                {
//                  model    : sequelize.models.LeaveDay,
//                  required : false,
//                  as       : 'days',
//                  where    : {
//                    date : {
//                      $between : [
//                        moment(year).startOf('year').format('YYYY-MM-DD'),
//                        moment(year).endOf('year').format('YYYY-MM-DD'),
//                      ],
//                    },
//                  },
//                },{
                    model : sequelize.models.LeaveType,
                    as    : 'leave_type',
                },{
                    model   : sequelize.models.User,
                    as      : 'approver',
                    include : [{
                      model   : sequelize.models.Company,
                      as      : 'company',
                      include : [{
                        model : sequelize.models.BankHoliday,
                        as    : 'bank_holidays',
                      }],
                    }],
              }] // End of my_leaves include
            },{
              model : sequelize.models.Department,
              as    : 'department',
            }
          ],
        },{
          model : sequelize.models.Department,
          as : 'departments',
          include : {
            model : sequelize.models.User,
            as : 'boss',
          }
        }
    ],
    order : [
      [
        {model : sequelize.models.Department, as : 'departments'},
        sequelize.models.Department.default_order_field(),
      ]
    ],
  })

  // Make sure that company got only one user associated with for
  // provided user_id
  .then(function(company){

      if (!company || company.users.length !== 1) {
          throw new Error(
              'User '+current_user.id+' tried to edit user '+user_id
                  +' but they do not share a company'
          );
      }

      return Promise.resolve(company);
    });
  };


  this.get_company_for_add_user = function() {
    var model = sequelize.models;

    return this.getCompany({
      include : [
        {model : model.Department, as : 'departments'}
      ],
      order : [
        [
          {model : model.Department, as : 'departments'},
          model.Department.default_order_field(),
        ]
      ],
    });
  };


  this.get_company_with_all_users = function(){
    return this.getCompany({
      include : [
        {
          model : sequelize.models.User,
          as    : 'users',
        },
      ],
      order : [
        [{ model : sequelize.models.User, as : 'users' }, 'lastname']
      ]
    });
  };


  this.get_company_with_all_leave_types = function() {
    return this.getCompany({
      include : [{
        model : sequelize.models.LeaveType,
        as    : 'leave_types',
      }],
      order : [
        [{ model : sequelize.models.LeaveType, as : 'leave_types' }, 'name']
      ]
    });
  };

};

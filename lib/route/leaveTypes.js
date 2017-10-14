
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    uuid      = require('node-uuid'),
    EmailTransport = require('../email');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/add/', function(req, res){
  req.user
    .get_company_for_add_user()
    .then(function(company){
      res.render('leave_type_add', {
        company : company,
      });
    });
});

router.post('/add/', function(req, res){
    var current_company,
      model = req.app.get('db_model');

    req.user
    .get_company_for_add_user()
    .then(function(company){
      current_company = company;
      var new_leave_type_attributes = get_and_validate_leave_type_parameters({
        req : req
      });

      new_leave_type_attributes.companyId = company.id;

      return Promise.resolve(new_leave_type_attributes);
    })

    .then(function(new_leave_type_attributes){
        return model.LeaveType.find_by_name(new_leave_type_attributes.name)
          .then(function(leave_type){
            if(leave_type) {
              req.session.flash_error('Name is already in use');
              throw new Error('Name is already used');
            }

            return Promise.resolve(new_leave_type_attributes);
          });
    })

    .then(function(new_leave_type_attributes){
        return model.LeaveType.create(new_leave_type_attributes);
    })

    .then(function(){
      if( req.session.flash_has_errors() ) {
          return res.redirect_with_session('../add/')
      } else {
        req.session.flash_message('New Leave Type successfully added')
        return res.redirect_with_session('../');
      }
    })

    .catch(function(error){
        console.error(
          'An error occurred when trying to add new leave type account by user '
          + ' : ' + error
        );

        req.session.flash_error(
            'Failed to add Leave Type'
        );

        return res.redirect_with_session('../add/')
    })
})


router.get('/', function(req, res) {

    var department_id = req.param('department'),
        users_filter = {},
        model = req.app.get('db_model');

    if (validator.isNumeric( department_id )) {
      users_filter = { DepartmentId : department_id };
    } else {
      department_id = undefined;
    }

    req.user.getCompany({
      include : [
        {
          model    : model.User,
          as       : 'users',
          where    : users_filter,
          required : false,
          include : [
            { model : model.Department, as : 'department' },
            // Following is needed to be able to calculate how many days were
            // taken from allowance
            {
              model    : model.Leave,
              as       : 'my_leaves',
              required : false,
              where : {
                // status : model.Leave.status_approved(),
                status : [
                  model.Leave.status_approved(),
                  model.Leave.status_new(),
                  model.Leave.status_pended_revoke(),
                ],
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
              include : [{
                    model : model.LeaveType,
                    as    : 'leave_type',
                },
              ] // End of my_leaves include
            }
          ],
        },
        {
          model   : model.LeaveType,
          as      : 'leave_types'
        }
      ],
      order : [
        [{ model : model.User, as : 'users' }, 'lastname'],
        [
          { model : model.User, as : 'users' },
          { model : model.Department, as : 'department'},
          model.Department.default_order_field()
        ],
      ]
    })

    // Make sure that objects have all necessary attributes to render page
    // (template system is sync only)
    .then(function(company){
      return company.getBank_holidays()
        // stick bank holidays to company
        .then(function(bank_holidays){
          company.bank_holidays = bank_holidays;
          return company.getDepartments({
            order : [ model.Department.default_order_field() ],
          });
        })
        // stick departments to company as well
        .then(function(departments){
          company.departments = departments;
          return Promise.resolve(company);
        })
    })

    // Make sure that user's leaves have reference back to user in question
    .then(function(company){
      company.users.forEach(function(user){
        user.company = company;
        user.my_leaves.forEach(function(leave){ leave.user = user });
      });

      return Promise.resolve(company);
    })

    // Update users to have neccessary data for leave calculations
    .then(function(company){
      return Promise.resolve(company.users).map(function(user){
        return user.promise_schedule_I_obey();
      },{
        concurrency : 10,
      })
      .then(function(){ return Promise.resolve(company) });
    })

    .then(function(company){
        res.render('leave_type', {
            title   : company.name + "'s people",
            users   : company.users,
            leave_types: company.leave_types,
            company : company,
            department_id : Number(department_id),
        });
    });
});

function get_and_validate_leave_type_parameters(args) {
    var req = args.req;

    var name     = validator.trim(req.param('name')),
        color    = validator.trim(req.param('color')),
        use_allowance    = validator.toInt(req.param('use_allowance')),
        limit    = validator.toInt(req.param('limit'));

    var attributes = {
      name : name,
      color : color,
      use_allowance : use_allowance,
      limit : limit
    }

    return attributes;
}

module.exports = router;

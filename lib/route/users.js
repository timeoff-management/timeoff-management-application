
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    uuid      = require('node-uuid'),
    LeaveCollectionUtil = require('../model/leave_collection')(),
    EmailTransport = require('../email');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/add/', function(req, res){
  req.user
    .get_company_for_add_user()
    .then(function(company){
      res.render('user_add', {
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

    var new_user_attributes = get_and_validate_user_parameters({
      req              : req,
      item_name        : 'user',
      departments      : company.departments,
      // If current company has LDAP auth do not require password
      require_password : (company.ldap_auth_enabled ? false : true ),
    });

    // TODO: make department responsible for adding new useR?
    new_user_attributes.password = model.User.hashify_password(
      // ... Instead use random string as password
      // (users will be able to reset it when needed)
      new_user_attributes.password || uuid.v4()
    );
    new_user_attributes.companyId = company.id;

    return Promise.resolve(new_user_attributes);
  })

  // Make sure that we do not add user with existing emails
  .then(function(new_user_attributes){
      return model.User.find_by_email(new_user_attributes.email)
        .then(function(user){

          if (user) {
            req.session.flash_error('Email is already in use');
            throw new Error('Email is already used');
          }

          return Promise.resolve(new_user_attributes);
        });
  })

  .then(new_user_attributes => {

    // User table is not going to hold adjustments
    delete new_user_attributes.adjustment;

    return model.User.create(new_user_attributes)
  })

  .then(function(new_user){
    var Email = new EmailTransport();

    return Email.promise_add_new_user_email({
      company    : current_company,
      admin_user : req.user,
      new_user   : new_user,
    });
  })

  .then(function(){
      if ( req.session.flash_has_errors() ) {
          return res.redirect_with_session('../add/');
      } else {
          req.session.flash_message('New user account successfully added');
          return res.redirect_with_session('../');
      }
  })

  .catch(function(error){
      console.error(
          'An error occurred when trying to add new user account by user '+req.user.id
          + ' : ' + error
      );

      req.session.flash_error(
          'Failed to add new user'
      );

      return res.redirect_with_session('../add/');
  });
});

router.get('/edit/:user_id/', function(req, res){
  var user_id = validator.trim(req.param('user_id'));

  Promise.try(function(){
    ensure_user_id_is_integer({req : req, user_id : user_id});
  })
  .then(function(){
    return req.user.get_company_for_user_details({
      user_id : user_id,
    });
  })
  .then(function(company){

    var employee = company.users[0];

    return employee.promise_schedule_I_obey()
      .then(function(){
        res.render('user_details', {
          company       : company,
          employee      : employee,
          show_main_tab : true,
        });
      });
  })
  .catch(function(error){
    console.error(
      'An error occurred when trying to open employee details by user '+req.user.id
      + ' : ' + error
    );

    return res.redirect_with_session('../../');
  });
});

router.get('/edit/:user_id/absences/', function(req, res){
  var user_id = validator.trim(req.param('user_id'));

  Promise

  .try( () => ensure_user_id_is_integer({req : req, user_id : user_id}) )
  .then(() => req.user.get_company_for_user_details({ user_id : user_id }) )
  .then(function(company){
    let employee = company.users[0];
    return employee.reload_with_session_details();
  })
  .then( employee => employee.reload_with_leave_details({}))
  .then(employee => Promise.join(

    employee
      .promise_number_of_days_available_in_allowance()
      .then( days => Promise.resolve([days, employee]) ),

    employee
      .promise_total_number_of_days_in_allowance(),

    employee
      .promise_adjustmet_for_year(moment().format('YYYY')),

    (args, total_days_number, employee_adjustment) => {
      args.push(total_days_number);
      args.push(employee_adjustment);
      return Promise.resolve(args);
    })
  )
  .then(args => {
    let
      remaining_allowance = args[0],
      employee = args[1],
      total_days_number = args[2],
      employee_adjustment = args[3];

    let leave_statistics = {
      total_for_current_year : total_days_number,
      remaining              : remaining_allowance,
    };

    leave_statistics.used_so_far = leave_statistics.total_for_current_year - leave_statistics.remaining;

    leave_statistics.used_so_far_percent = leave_statistics.total_for_current_year > 0
      ? 100 * leave_statistics.used_so_far / leave_statistics.total_for_current_year
      : 0;

    leave_statistics.remaining_percent = leave_statistics.total_for_current_year > 0
      ? 100 *  leave_statistics.remaining / leave_statistics.total_for_current_year
      : 0;

    return employee
      .promise_schedule_I_obey()
      .then(function(){
        employee
          .promise_my_active_leaves_ever({})
          .then(leaves => LeaveCollectionUtil.promise_to_group_leaves(leaves))
          .then(function(grouped_leaves){

            res.render('user_details', {
              employee         : employee,
              grouped_leaves   : grouped_leaves,
              show_absence_tab : true,
              leave_type_statistics : employee.get_leave_statistics_by_types(),
              leave_statistics      : leave_statistics,
              employee_adjustment   : employee_adjustment,
            });

          });
      });
  })
  .catch(function(error){
    console.error(
      'An error occurred when trying to open employee absences by user '+req.user.id
      + ' : ' + error
    );

    return res.redirect_with_session('../../../');
  });
});


router.get('/edit/:user_id/schedule/', function(req, res){
  var user_id = validator.trim(req.param('user_id'));

  Promise.try(function(){
    ensure_user_id_is_integer({req : req, user_id : user_id});
  })
  .then(function(){
    return req.user.get_company_for_user_details({
      user_id : user_id,
    });
  })
  .then(function(company){

    var employee = company.users[0];

    return employee
      .promise_schedule_I_obey()
      .then(function(schedule){
        res.render('user_details', {
          employee          : employee,
          schedule          : schedule,
          show_schedule_tab : true,
        });
      });
  })
  .catch(function(error){
    console.error(
      'An error occurred when trying to open employee absences by user '+req.user.id
      + ' : ' + error
    );

    return res.redirect_with_session('../../../');
  });
});


// Special step performed while savinf existing employee accont details
//
// In case when employee had "end date" populated and now it is going
// to be updated to be in future - check if during the time user was inactive
// new user was added (including other companies)
//
var ensure_user_was_not_useed_elsewhere_while_being_inactive = function(args){
  var
    employee            = args.employee,
    new_user_attributes = args.new_user_attributes,
    req                 = args.req,
    model               = args.model;

  if (
    // Employee has end_date defined
    employee.end_date &&
    (
     ! new_user_attributes.end_date
     ||
      (
        // new "end_date" is provided
        // new "end_date" is in future
        new_user_attributes.end_date &&
        moment( new_user_attributes.end_date ).startOf('day').toDate() >= moment().startOf('day').toDate()
      )
    )
  ) {
    return model.User.find_by_email(new_user_attributes.email)
      .then(function(user){

        if (user && user.companyId !== employee.companyId) {
          var error_msg = 'There is an active account with similar email somewhere within system.';
          req.session.flash_error(error_msg);
          throw new Error(error_msg);
        }

        return Promise.resolve();
      });
  }

  return Promise.resolve();
};

// Extra step: in case when employee is going to have new email,
// check that it is not duplicated
//
var ensure_email_is_not_used_elsewhere = function(args){
  var
    employee            = args.employee,
    new_user_attributes = args.new_user_attributes,
    req                 = args.req,
    model               = args.model;

  if (new_user_attributes.email === employee.email) {
    return Promise.resolve();
  }

  return model.User
    .find_by_email(new_user_attributes.email)
    .then(function(user){

      if (user) {
        req.session.flash_error('Email is already in use');
        throw new Error('Email is already used');
      }

      return Promise.resolve();
    });
};

var ensure_we_are_not_removing_last_admin = function(args){
  var
    employee            = args.employee,
    new_user_attributes = args.new_user_attributes,
    req                 = args.req,
    model               = args.model;

  if (
    // It is about to change admin rights
    new_user_attributes.admin !== employee.admin
    // and it is revoking admin rights
    && ! new_user_attributes.admin
  ) {
    return model.User
      .count({ where : {
        companyId : employee.companyId,
        id        : { $ne : employee.id},
        admin     : true,
      }})
      .then(function(number_of_admins_to_be_left){
        if (number_of_admins_to_be_left > 0) {
          return Promise.resolve();
        }

        req.session.flash_error('This is last admin witihn company. Cannot revoke admin rights.');
        throw new Error('Attempt to revoke admin rights from last admin in comapny '+employee.companyId);
      });
  }

  return Promise.resolve();
};

router.post('/edit/:user_id/', function(req, res){
  var user_id = validator.trim(req.param('user_id'));

  var new_user_attributes,
    employee,
    model = req.app.get('db_model');

  Promise.try(function(){
    ensure_user_id_is_integer({req : req, user_id : user_id});
  })
  .then(function(){
    return req.user.get_company_for_user_details({
      user_id : user_id,
    });
  })
  .then(function(company){

    new_user_attributes = get_and_validate_user_parameters({
      req         : req,
      item_name   : 'user',
      departments : company.departments,
    });

    if (new_user_attributes.password) {
      new_user_attributes.password = model.User.hashify_password(
        new_user_attributes.password
      );
    }

    employee = company.users[0];

    return Promise.resolve();
  })

  // Ensure that new email if it was changed is not used anywhere else
  // withing system
  .then(function(){ return ensure_email_is_not_used_elsewhere({
    employee            : employee,
    new_user_attributes : new_user_attributes,
    req                 : req,
    model               : model,
  })})

  // Double check user in case it is re-activated
  .then(function(){ return ensure_user_was_not_useed_elsewhere_while_being_inactive({
    employee            : employee,
    new_user_attributes : new_user_attributes,
    req                 : req,
    model               : model,
  })})

  .then(function(){ return ensure_we_are_not_removing_last_admin({
    employee            : employee,
    new_user_attributes : new_user_attributes,
    req                 : req,
    model               : model,
  })})

  // All validations are passed: update database
  .then(function(){

    let adjustment = new_user_attributes.adjustment;
    delete new_user_attributes.adjustment;

    employee

      // Update user record
      .updateAttributes(new_user_attributes)

      // Update adjustment if necessary
      .then(() => {
        if ( adjustment !== undefined  ) {
          return employee.promise_to_update_adjustment({
            year : moment().format('YYYY'),
            adjustment : adjustment,
          });
        }

        return Promise.resolve();
      })

      .then(function(){
        req.session.flash_message(
          'Details for '+employee.full_name()+' were updated'
        );
        return res.redirect_with_session(req.body.back_to_absences ? './absences/' : '.');
      });
  })

  .catch(function(error){
    console.error(
      'An error occurred when trying to save chnages to user account by user '+req.user.id
      + ' : ' + error
    );

    req.session.flash_error(
      'Failed to save changes.'
    );

    return res.redirect_with_session(req.body.back_to_absences ? './absences/' : '.');
  });
});


router.post('/delete/:user_id/', function(req, res){
    var user_id = validator.trim(req.param('user_id'));

    Promise.try(function(){
        ensure_user_id_is_integer({req : req, user_id : user_id});
    })
    .then(function(){
        return req.user.get_company_for_user_details({
            user_id : user_id,
        });
    })
    .then(function(company){

        var employee = company.users[0];


        return employee.remove();

    })
    .then(function(result){
        req.session.flash_message(
            'Employee records were removed from the system'
        );
        return res.redirect_with_session('../..');
    })
    .catch(function(error){
        console.error(
            'An error occurred when trying to remove user '+user_id+' by user '
              + req.user.id  + '. Error: ' + error
        );

        req.session.flash_error(
            'Failed to remove user. ' + error
        );

        return res.redirect_with_session('../../edit/'+user_id+'/');
    });
});


router.all('/search/', function(req, res){

  // Currently we support search only by email and only JSON type requests
  if ( ! req.accepts('json')) {
    // redirect client to the users index page
    return res.redirect_with_session('../');
  }

  var email = validator.trim( req.param('email') ).toLowerCase();

  if ( ! validator.isEmail( email )) {
    req.session.flash_error('Provided email does not look like valid one: "'+email+'"');
    return res.json([]);
  }

  // search for users only related to currently login admin
  //
  var promise_result = req.user.getCompany({
    include : [{
      model : req.app.get('db_model').User,
      as : 'users',
      where : {
        email : email
      }
    }]
  });

  promise_result.then(function(company){
    if (company.users.length > 0) {
      res.json(company.users)
    } else {
      res.json([]);
    }
  });
});


/* Handle the root for users section, it shows the list of all users
 * */
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

    /*
     * Following block builds array of object for each user in company.
     * Each object consist of following keys:
     *  - user_row : reference to the sequelize user row object
     *  - number_of_days_available_in_allowance : number of days remaining in allowance for given user
     *
     * This step is necessary because we are moving to non-blocking API for libraries,
     * so we need to get all data before passing it into template as template
     *
     * */
    .then(company => Promise
      .resolve(company.users)
      .map(user => user
        .promise_number_of_days_available_in_allowance()
        .then(number_of_days => Promise.resolve({
          user_row : user,
          number_of_days_available_in_allowance : number_of_days,
        })),
        {
          concurrency : 10
        }
      )
      .then(users_info => Promise.resolve([company, users_info]))
    )

    .then(function(args){
      let
        company = args[0],
        users_info = args[1];

      res.render('users', {
        company       : company,
        department_id : Number(department_id),
        title         : company.name + "'s people",
        users_info    : users_info,
      });
    });
});

function get_and_validate_user_parameters(args) {
    var req         = args.req,
        item_name   = args.item_name,
        require_password = args.require_password || false;

    // Get user parameters
    var name     = validator.trim(req.param('name')),
        lastname = validator.trim(req.param('lastname')),
        email    = validator.trim(req.param('email_address')),
        department_id     = validator.trim(req.param('department')),
        start_date        = validator.trim(req.param('start_date')),
        end_date          = validator.trim(req.param('end_date')),
        adjustment        = validator.trim(req.param('adjustment')),
        password          = validator.trim(req.param('password_one')),
        password_confirm  = validator.trim(req.param('password_confirm')),
        admin             = validator.toBoolean(req.param('admin')),
        auto_approve      = validator.toBoolean(req.param('auto_approve'));

    // Validate provided parameters

    if (!validator.isEmail(email)) {
        req.session.flash_error(
            'New email of '+item_name+' should be valid email address'
        );
    }

    if (!validator.isNumeric(department_id)) {
        req.session.flash_error(
            'New department number of '+item_name+' should be a valid number'
        );
    }

    if (adjustment && ! validator.isFloat(adjustment) ) {
      req.session.flash_error(
        'New allowance adjustment of '+item_name+' should be a valid number'
      );
    } else if (adjustment && ! ( adjustment % 1 === 0 || Math.abs( adjustment % 1 ) === 0.5 )) {
      req.session.flash_error(
        'New allowance adjustment of '+item_name+' should be either whole integer number or with half'
      );
    }

    start_date = req.user.company.normalise_date( start_date );

    if (!validator.isDate(start_date)) {
      req.session.flash_error(
        'New start date for '+item_name+' should be valid date'
      );
    }

    if (end_date ){

      end_date = req.user.company.normalise_date( end_date );

      if ( ! validator.isDate(end_date)) {
        req.session.flash_error(
          'New end date for '+item_name+' should be valid date'
        );
      }
    }

    if (
        start_date &&
        end_date &&
        moment(start_date).toDate() > moment(end_date).toDate()
    ){
        req.session.flash_error(
            'End date for '+item_name+' is before start date'
        );
    }

    if (password && password !== password_confirm) {
      req.session.flash_error('Confirmed password does not match initial one');
    }

    if (require_password && ! password) {
      req.session.flash_error('Password is required');
    }

    if ( req.session.flash_has_errors() ) {
        throw new Error( 'Got validation errors' );
    }

    // Normalize email as we operate only with lower case letters in emails
    email = email.toLowerCase();

    var attributes = {
        name         : name,
        lastname     : lastname,
        email        : email,
        DepartmentId : department_id,
        start_date   : start_date,
        end_date     : (end_date || null),
        admin        : admin,
        auto_approve : auto_approve,
    };

    if (adjustment || String(adjustment) === '0') {
      attributes.adjustment = adjustment;
    }

    if ( password ) {
      attributes.password = password;
    }

    return attributes;
}

function ensure_user_id_is_integer(args){
    var req     = args.req,
        user_id = args.user_id;

    if (! validator.isInt(user_id)){
        throw new Error(
          'User '+req.user.id+' tried to edit user with non-integer ID: '+user_id
        );
    }

    return;
}

module.exports = router;

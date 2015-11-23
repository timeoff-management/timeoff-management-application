
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    _         = require('underscore'),
    EmailTransport = require('../email');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/add/', function(req, res){

    // Add JS that is specific only to current page
    res.locals.custom_java_script.push(
        '/js/bootstrap-datepicker.js'
    );

    res.locals.custom_css.push(
        '/css/bootstrap-datepicker3.standalone.css'
    );

    req.user
    .get_company_for_add_user()
    .then(function(company){
        res.render('user_add', {
            company : company,
        });
    });
});

router.post('/add/', function(req, res){

  var current_company;

  req.user
  .get_company_for_add_user()
  .then(function(company){

    current_company = company;

    var new_user_attributes = get_and_validate_user_parameters({
      req              : req,
      item_name        : 'user',
      departments      : company.departments,
      require_password : true,
    });

    // TODO: make department responsible for adding new useR?
    new_user_attributes.password = model.User.hashify_password(
      new_user_attributes.password
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

  .then(function(new_user_attributes){
      return model.User.create(new_user_attributes);
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

    // Add JS that is specific only to current page
    res.locals.custom_java_script.push(
        '/js/bootstrap-datepicker.js'
    );
    res.locals.custom_java_script.push(
        '/js/inittooltips.js'
    );

    res.locals.custom_css.push(
        '/css/bootstrap-datepicker3.standalone.css'
    );

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

      return employee.promise_my_active_leaves({})
        .then(function(leaves){
          res.render('user_edit', {
              company  : company,
              employee : employee,
              leaves   : leaves,
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

router.post('/edit/:user_id/', function(req, res){
  var user_id = validator.trim(req.param('user_id'));

  var new_user_attributes,
    employee;

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

  // Extra step: in case when employee is going to have new email,
  // check that it is not duplicated
  .then(function(){

    if (new_user_attributes.email !== employee.email) {

      return model.User.find_by_email(new_user_attributes.email)
        .then(function(user){

          if (user) {
            req.session.flash_error('Email is already in use');
            throw new Error('Email is already used');
          }

          return Promise.resolve();
        });
    }

    return Promise.resolve();
  })

  // All validations are passed: update database
  .then(function(){

    employee.updateAttributes(new_user_attributes).then(function(){
      req.session.flash_message(
        'Details for '+employee.full_name()+' were updated'
      );
      return res.redirect_with_session('.');
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

    return res.redirect_with_session('.');
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



/* Handle the root for users section, it shows the list of all users
 * */
router.get('/', function(req, res) {

    var department_id = req.param('department'),
        users_filter = {};

    if (validator.isNumeric( department_id )) {
      users_filter = { DepartmentId : department_id };
    }

    // TODO folowing query is stupid and needs to be rewritten starting from
    // leave_days table
    //
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
                // taked from allowence
                {
                  model    : model.Leave,
                  as       : 'my_leaves',
                  required : false,
                  where : {
                    status : model.Leave.status_approved(),
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
                    },{
                        model   : model.User,
                        as      : 'approver',
                        include : [{
                          model   : model.Company,
                          as      : 'company',
                          include : [{
                            model : model.BankHoliday,
                            as    : 'bank_holidays',
                          }],
                        }],
                  }] // End of my_leaves include
                }
              ],
            },
            { model : model.Department, as : 'departments' }
        ],
        order : [
          [{ model : model.User, as : 'users' }, 'lastname'],
          [{ model : model.Department, as : 'departments'}, model.Department.default_order_field()],
        ]
    })
    .then(function(company){
        res.render('users', {
            title   : company.name + "'s people",
            users   : company.users,
            company : company,
        });
    });
});

function get_and_validate_user_parameters(args) {
    var req         = args.req,
        item_name   = args.item_name,
        departments = args.departments,
        require_password = args.require_password || false;

    // Get user parameters
    var name     = validator.trim(req.param('name')),
        lastname = validator.trim(req.param('lastname')),
        email    = validator.trim(req.param('email')),
        department_number = validator.trim(req.param('department')),
        start_date        = validator.trim(req.param('start_date')),
        end_date          = validator.trim(req.param('end_date')),
        adjustment        = validator.trim(req.param('adjustment')),
        password          = validator.trim(req.param('password')),
        password_confirm  = validator.trim(req.param('password_confirm')),
        admin             = validator.toBoolean(req.param('admin')),
        department_id;

    // Validate provided parameters

    if (!validator.matches(name, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error(
            'New name of '+item_name+' should contain only letters and numbers'
        );
    }

    if (!validator.matches(lastname, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error(
            'New lastname of '+item_name+' should contain only letters and numbers'
        );
    }

    if (!validator.isEmail(email)) {
        req.session.flash_error(
            'New email of '+item_name+' should be valid email address'
        );
    }

    if (!validator.isNumeric(department_number)) {
        req.session.flash_error(
            'New department number of '+item_name+' should be a valid number'
        );
    }

    if (adjustment && ! validator.isNumeric(adjustment)) {
      req.session.flash_error(
          'New allowance adjustment of '+item_name+' should be a valid numner'
      );
    }

    if (!validator.matches(start_date, /\d{4}\-\d{2}\-\d{2}/)) {
        req.session.flash_error(
            'New start date for '+item_name+' should be valid date'
        );
    }

    if (end_date && !validator.matches(end_date, /\d{4}\-\d{2}\-\d{2}/)) {
        req.session.flash_error(
            'New end date for '+item_name+' should be valid date'
        );
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

    if (! departments[ department_number ] ){
        req.session.flash_error('Provoded department is incorrect');
        throw new Error(
            'User '+req.user.id+' submitted out of range department number'
        );
    } else {
        department_id = departments[ department_number ].id;
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

    var attributes = {
        name         : name,
        lastname     : lastname,
        email        : email,
        DepartmentId : department_id,
        start_date   : start_date,
        end_date     : (end_date || null),
        adjustment   : adjustment,
        admin        : admin,
    };

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

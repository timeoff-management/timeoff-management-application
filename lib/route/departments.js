
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    Promise   = require('bluebird'),
    moment    = require('moment'),
    config    = require('../config'),
    _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

function generate_all_department_allowances() {

  var allowance_options = [{ value : 0, caption : 'None'}],
    allowance = 0.5;

  while (allowance <= 50) {
    allowance_options.push({ value : allowance, caption : allowance });
    allowance += 0.5;
  }

  return allowance_options;
}

function get_and_validate_department(args) {
  var req             = args.req,
      index           = args.suffix,
      company         = args.company,
      department_name = args.department_name;

  // Get user parameters
  var name = validator.trim(req.param('name__'+index)),
      allowance = validator.trim(req.param('allowance__'+index)),
      include_public_holidays = validator.toBoolean(
          req.param('include_public_holidays__'+index)
      ),
      boss_id = validator.trim(req.param('boss_id__'+index));

  // Validate provided parameters
  //
  // New allowance should be from range of (0;50]
  if (!validator.isFloat(allowance)) {
    req.session.flash_error(
      'New allowance for '+department_name+' should be numeric'
    );
  } else if (!((0 <= allowance) && (allowance <= 50))) {
    req.session.flash_error(
      'New allowance for '+department_name+' should be between 0.5 and 50 days'
    );
  }
  // New manager ID should be numeric and from within
  // current company
  if (!validator.isNumeric( boss_id ) ) {
    req.session.flash_error(
      'New boss reference for '+department_name+' should be numeric'
    );
  } else if ( ! _.contains(
    _.map( company.users, function(user){ return String(user.id) }),
      String(boss_id)
  )) {
    req.session.flash_error(
      'New boss for '+department_name+' is unknown'
    );
  }

  return {
    allowance               : allowance,
    bossId                  : boss_id,
    include_public_holidays : include_public_holidays,
    name                    : name,
  };
}

router.get('/departments/', function(req, res){

  // Add JS that is specific only to current page
  res.locals.custom_java_script.push('/js/departments.js');

  var company_for_template,
    model = req.app.get('db_model');

  req.user.getCompany({
    scope : ['with_active_users', 'order_by_active_users'],
  })
  .then(function(company){
    company_for_template = company;
    return company.getDepartments({
      scope : ['with_simple_users', 'with_boss'],
      order : [[ model.Department.default_order_field() ]],
    });
  })
  .then(function(departments){
    res.render('departments_overview', {
      title             : 'Departments settings',
      departments       : departments,
      allowance_options : generate_all_department_allowances(),
      company           : company_for_template,
    });
  });
});

router.get('/departments-bulk-update/', function(req, res) {

  // Add JS that is specific only to current page
  res.locals.custom_java_script.push('/js/departments.js');

  var company_for_template,
    model = req.app.get('db_model');

  req.user.getCompany({
    scope : ['with_active_users', 'order_by_active_users'],
  })
  .then(function(company){
    company_for_template = company;
    return company.getDepartments({
      scope : ['with_simple_users'],
      // Explicitly order departments as all actions with them rely on
      // their order within current company
      // FIXME: Stupid decision needs to be ditched in favour of IDs
      order : [
        [ model.Department.default_order_field() ]
      ],
    });
  })
  .then(function(departments){
    res.render('departments_bulk_update', {
      title             : 'Departments bulk update',
      departments       : departments,
      company           : company_for_template,
      allowance_options : generate_all_department_allowances(),
    });
  });
});

router.post('/departments-bulk-update/', function(req, res){

  var name              = validator.trim(req.param('name')),
      country_code      = validator.trim(req.param('country')),
      model             = req.app.get('db_model');

  req.user.getCompany({
    scope : ['with_active_users', 'with_simple_departments'],
    order : [
      [ {model : model.Department, as : 'departments'}, model.Department.default_order_field() ]
    ],
  })

  .then(function(company){

    var promise_new_department = Promise.resolve(1);

    if (validator.trim(req.param('name__new'))) {
      var attributes = get_and_validate_department({
        req             : req,
        suffix          : 'new',
        company         : company,
        department_name : 'New department'
      });
      if ( req.session.flash_has_errors() ) {
        return Promise.resolve(1);
      }
      attributes.companyId = company.id;
      promise_new_department = model.Department.create(attributes);
    }

    return Promise.all([
      promise_new_department,
      _.map(
        company.departments,
        function(department, index){
          var attributes = get_and_validate_department({
            req             : req,
            suffix          : index,
            company         : company,
            department_name : department.name,
          });

          // If there were any validation errors: do not update department
          // (it affects all departments, that is if one department failed
          // validation - all departments are not to be updated)
          if ( req.session.flash_has_errors() ) {
            return Promise.resolve(1);
          }

          return department.updateAttributes(attributes);
        }
      ) // End of map that create department update promises
    ]);
  })

  .then(function(){
    if ( req.session.flash_has_errors() ) {
      // There were errors: stay on "bulk update" page
      return res.redirect_with_session('/settings/departments-bulk-update/');
    } else {
      // Managed to save successfully: lead user back to Deprtments overview page
      req.session.flash_message('Changes to departments were saved');
      return res.redirect_with_session('/settings/departments/');
    }
  })

  .catch(function(error){
    console.error(
      'An error occurred when trying to edit departments by user '+req.user.id
      + ' : ' + error
    );

    req.session.flash_error(
      'Failed to update departments details, please contact customer service'
    );

    return res.redirect_with_session('/settings/departments-bulk-update/');
  });
});

router.post('/departments/delete/:department_id/', function(req, res){

  var department_id = req.param('department_id');

  if (!validator.isInt(department_id)) {
    console.error(
      'User '+req.user.id+' submited non-int department ID '+department_id
    );

    req.session.flash_error('Cannot remove department: wronge parameters');

    return res.redirect_with_session('/settings/departments/');
  }

  req.user.getCompany()

  .then(function(company){
    return company.getDepartments({
      scope : ['with_simple_users'],
      where : {
        id : department_id,
      }
    });
  })
  .then(function(departments){
    var department_to_remove = departments[ 0 ];

    // Check if user specify valid department number
    if (! department_to_remove) {

      req.session.flash_error('Cannot remove department: wronge parameters');

      throw new Error(
        'User '+req.user.id+' tried to remove non-existing department ID'+department_id
      );
    }

    if (department_to_remove.users.length > 0){
      req.session.flash_error(
        'Cannot remove department '+department_to_remove.name
          +' as it still has '
          +department_to_remove.users.length+' users.'
      );

      throw new Error('Department still has users');
    }

    return department_to_remove.destroy();
  })
  .then(function(){
    req.session.flash_message('Department was successfully removed');
    return res.redirect_with_session('/settings/departments/');
  })
  .catch(function(error){

    console.error(
      'An error occurred when trying to edit departments by user '+req.user.id+' : '+error
    );

    return res.redirect_with_session('/settings/departments/');
  });
});

function promise_to_extract_company_and_department(req) {
  var department_id = req.param('department_id'),
    company;

  return Promise.try(function(){

    if ( ! validator.isInt(department_id)) {
      throw new Error('User '+req.user.id+' tried to open department refered by  non-int ID '+department_id);
    }

    return req.user.getCompany({
      scope : ['with_active_users', 'order_by_active_users'],
    });
  })
  .then(function(c){
    company = c;
    return company.getDepartments({
      scope : ['with_simple_users', 'with_boss'],
      where : {
        id : department_id,
      }
    });
  })
  .then(function(departments){
    var department = departments[0];

    // Ensure we have database record for given department ID
    if ( ! department ) {
      throw new Error('Non existing department ID provided');
    }

    return Promise.resolve({
      company    : company,
      department : department,
    });
  });
}

router.get('/departments/edit/:department_id/', function(req, res){
  var department_id = req.param('department_id');

  Promise.try(function(){
    return promise_to_extract_company_and_department(req);
  })
  .then(function(result){
    var department = result.department,
      company = result.company;

    res.render('department_details', {
      title      : 'Departments bulk update',
      department : department,
      company    : company,
      allowance_options : generate_all_department_allowances(),
    });
  })
  .catch(function(error){
    console.error(
      'An error occurred when trying to edit department '+department_id
      +' for user '+req.user.id + ' : ' + error
    );

    req.session.flash_error(
      'Failed to fetch details for given department'
    );

    return res.redirect_with_session('/settings/departments/');
  });
});

router.get('/departments/available-supervisors/:department_id/', function(req, res){

  var department_id = req.param('department_id');

  Promise.try(function(){
    return promise_to_extract_company_and_department(req);
  })
  .then(function(result){
    var department = result.department,
      company = result.company;

    res.render('department/available_supervisors', {
      users : _.filter(company.users, function(user){ return user.id !== department.bossId }),
      layout  : false,
    });
  })
  .catch(function(error){
    console.error(
      'An error occurred when trying to get all availabele superviers for department '+department_id
      +' for user '+req.user.id + ' : ' + error
    );

    res.send('REQUEST FAILED');
  });
});

module.exports = router;

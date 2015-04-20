/*
 *
 * */

"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    _         = require('underscore');

// Make sure that current user is authorized to deal with settings 
router.all(/.*/, function (req, res, next) {

    // User should be login to view settings pages
    if ( !req.user ) {
        return res.redirect(303, '/');
    }

    // Only Admin users allowed to deal with settings pages
    if (!req.user.is_admin()) {
        return res.redirect(303, '/');
    }

    next();
});

router.get('/company/', function(req, res) {

    req.user.getCompany().then(function(company){
        res.render('company', {
            title   : 'Company settings',
            company : company,
        });
    });
});

router.post('/company/', function(req, res){

    var name              = validator.trim(req.param('name')),
        country_code      = validator.trim(req.param('country')),
        start_of_new_year = validator.trim(req.param('year_starts'));

    if (!validator.matches(name, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error('Name should contain only letters and numbers');
    }
    if (!validator.isAlphanumeric(country_code)){
        req.session.flash_error('Country should contain only letters and numbers');
    }
    if (!validator.isInt(start_of_new_year)) {
        req.session.flash_error('Start of the year should be a month number');
    }

    // In case of validation error redirect back to edit form
    if ( req.session.flash_has_errors() ) {
        return res.redirect('/settings/company/');
    }

    req.user.getCompany()

    .then(function(company){
        company.name              = name;
        company.country           = country_code;
        company.start_of_new_year = start_of_new_year;

        return company.save();
    })
    .then(function(){
        req.session.flash_message('Company was successfully updated');
        return res.redirect('/settings/company/');
    })
    .catch(function(error){
        console.error(
            'An error occurred when trying to edit company for user ' + req.user.id
            + ' : ' + error
        );

        req.session.flash_error(
            'Failed to update company details, please contact customer service'   
        );

        return res.redirect('/settings/company/');
    });
});


router.get('/departments/', function(req, res) {

    // Add JS that is specific only to current page
    res.locals.custom_java_script.push('/js/departments.js');

    var company_for_template;

    req.user.getCompany({
            include : [{ model : model.User, as : 'users' }],
        })
        .then(function(company){
            company_for_template = company;
            return company.getDepartments({
                include : [
                    { model : model.User, as : 'users' },
                ],
            });
        })
        .then(function(departments){

            var allowence_options = [],
                allowence = 0.5;
            while (allowence <= 50) {
                allowence_options.push( {value : allowence} ); 
                allowence = allowence + 0.5;
            }

            res.render('departments', {
                title             : 'Departments settings',
                departments       : departments,
                company           : company_for_template,
                allowence_options : allowence_options,
            });
        });
});

router.post('/departments/', function(req, res){

    var name              = validator.trim(req.param('name')),
        country_code      = validator.trim(req.param('country')),
        start_of_new_year = validator.trim(req.param('year_starts'));

    req.user.getCompany({
        // TODO make sure that departments are order in the same way as on get handler
        include : [
            {model : model.Department, as : 'departments'},
            {model : model.User, as : 'users'}
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
            return res.redirect('/settings/departments/');
        } else {
            req.session.flash_message('Changes to departments were saved');
            return res.redirect('/settings/departments/');
        }
    })

    .catch(function(error){
        console.error(
            'An error occurred when trying to edit departents by user ' + req.user.id
            + ' : ' + error
        );

        req.session.flash_error(
            'Failed to update departents details, please contact customer service'   
        );

        return res.redirect('/settings/departments/');
    });
});

function get_and_validate_department(args) {
    var req             = args.req,
        index           = args.suffix,
        company         = args.company,
        department_name = args.department_name;

    // Get user parameters
    var name = validator.trim(req.param('name__'+index)),
        allowence = validator.trim(req.param('allowence__'+index)),
        include_public_holidays = validator.toBoolean(
            req.param('include_public_holidays__'+index)
        ),
        boss_id = validator.trim(req.param('boss_id__'+index));

    // Validate provided parameters
    if (!validator.matches(name, /^[a-z0-9 \.\,]+$/i)){
        req.session.flash_error(
            'New name of '+department_name+' should contain only letters and numbers'
        );
    }
    // New allowance should be from range of (0;50]
    if (!validator.isFloat(allowence)) {
        req.session.flash_error(
            'New allowence for '+department_name+' should be numeric'
        );
    } else if (!((0 < allowence) && (allowence <= 50))) {
        req.session.flash_error(
            'New allowence for '+department_name+' should be between 0.5 and 50 days'   
        );
    }
    // New manager ID should be numeric and from within
    // current company
    if (!validator.isNumeric( boss_id ) ) {
        req.session.flash_error(
            'New boss reference for '+department_name+' should be numeric'
        );
    } else if (_.contains(
        _.map(
            company.users, function(user){ return user.id; }),
            boss_id
    )) {
        req.session.flash_error(
            'New boss for '+department_name+' is unknown'
        );
    }

    return {
        name                    : name,
        allowence               : allowence,
        include_public_holidays : include_public_holidays,
        bossId                  : boss_id,
    };
}

module.exports = router;

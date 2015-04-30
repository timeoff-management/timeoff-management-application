
"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/add/', function(req, res){
    req.user.getCompany({
        include : [
            {model : model.Department, as : 'departments'}
        ],
        order : [
            [{model : model.Department, as : 'departments'}, model.Department.default_order_field()]
        ],
    })
    .then(function(company){
        res.render('user_add', {
            company : company,
        });
    });
});

router.post('/add/', function(req, res){
    req.user.getCompany({
        include : [
            {model : model.Department, as : 'departments'}
        ],
        order : [
            [{model : model.Department, as : 'departments'}, model.Department.default_order_field()]
        ],
    })
    .then(function(company){
        var new_user_attributes = get_and_validate_user_parameters({
            req         : req,
            item_name   : 'user',
            departments : company.departments,
        });

        // TODO: make department responsible for adding new useR?
        //
        // TODO : this is dev only logic!
        new_user_attributes.password = model.User.hashify_password('123456');
        new_user_attributes.companyId = company.id;

        return model.User.create(new_user_attributes);
    })

    .then(function(){
        if ( req.session.flash_has_errors() ) {
            return res.redirect('../add/');
        } else {
            req.session.flash_message('New user account successfully added');
            return res.redirect('../');
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

        return res.redirect('../add/');
    });
});


router.get('/edit/:user_id/', function(req, res){
    var user_id = validator.trim(req.param('user_id'));

    if (! validator.isInt(user_id)){
        console.error(
          'User '+req.user.id+' tried to edit user with non-integer ID: '+user_id
        );
    }

    req.user.getCompany({
        include : [
            {model : model.User, as : 'users', where : { id : user_id }},
            {model : model.Department, as : 'departments'}
        ],
        order : [
            [{model : model.Department, as : 'departments'}, model.Department.default_order_field()]
        ],
    })
    .then(function(company){

        validate_company_users_for_edit_employee({
            req     : req,
            company : company,
            user_id : user_id,
        });

        res.render('user_edit', {
            company  : company,
            employee : company.users[0],
        });
    })
    .catch(function(error){
        console.error(
            'An error occurred when trying to open employee details by user '+req.user.id
            + ' : ' + error
        );

        return res.redirect('../../');
    });
});

router.post('/edit/:user_id/', function(req, res){
    var user_id = validator.trim(req.param('user_id'));

    Promise.resolve(1)
    .then(function(){
        if (! validator.isInt(user_id)){
            // TODO throwing an error here does not abort execution... FIXME
            throw new Error(
              'User'+req.user.id+' tried to edit user with non-integer ID: '+user_id
            );
        }
        return Promise.resolve(1);
    })
    .then(function(){
        return req.user.getCompany({
            include : [
                {model : model.User, as : 'users', where : { id : user_id }},
                {model : model.Department, as : 'departments'}
            ],
            order : [
                [{model : model.Department, as : 'departments'}, model.Department.default_order_field()]
            ],
        })
    })
    .then(function(company){

        validate_company_users_for_edit_employee({
            req     : req,
            company : company,
            user_id : user_id,
        });

        var new_user_attributes = get_and_validate_user_parameters({
            req         : req,
            item_name   : 'user',
            departments : company.departments,
        });



        res.render('user_edit', {
            company  : company,
            employee : company.users[0],
        });
    })
    .catch(function(error){
        console.error(
            'An error occurred when trying to save chnages to user account by user '+req.user.id
            + ' : ' + error
        );

        req.session.flash_error(
            'Failed to save changes'
        );

        return res.redirect('../../');
    });
});



router.get('/', function(req, res) {

    req.user.getCompany({
        include : [
            {
                model : model.User,
                as : 'users',
                include : [{ model : model.Department, as : 'department' }],
            },
            { model : model.Department, as : 'departments' }
        ],
        order : [
            [{ model : model.User, as : 'users' }, 'lastname'],
            [{ model : model.Department, as : 'departments'}, model.Department.default_order_field()]
        ]
    })
    .then(function(company){
        res.render('users', {
            title : company.name + "'s people",
            users : company.users,
            company : company,
        });
    });
});

function get_and_validate_user_parameters(args) {
    var req         = args.req,
        item_name   = args.item_name,
        departments = args.departments;

    // Get user parameters
    var name     = validator.trim(req.param('name')),
        lastname = validator.trim(req.param('lastname')),
        email    = validator.trim(req.param('email')),
        department_number = validator.trim(req.param('department')),
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

    if (! departments[ department_number ] ){
        req.session.flash_error('Provoded department is incorrect');
        throw new Error(
            'User '+req.user.id+' submitted out of range department number'
        );
    } else {
        department_id = departments[ department_number ].id;
    }

    if ( req.session.flash_has_errors() ) {
        throw new Error( 'Got validation errors' );
    }

    return {
        name         : name,
        lastname     : lastname,
        email        : email,
        DepartmentId : department_id,
    };
}

/*
 *  To be used when one needs ot check if comapny has proper amount of
 *  "users" when edititng employee details.
 *  There should be only one record: the one to be edited.
 * */
function validate_company_users_for_edit_employee(args) {
    var company = args.company,
        req     = args.req,
        user_id = args.user_id;

    if (!company || company.users.length !== 1) {
        throw new Error(
            'User '+req.user.id+' tried to edit user '+user_id
        );
    }

    return;
}

module.exports = router;


"use strict";

var express   = require('express'),
    router    = express.Router(),
    validator = require('validator'),
    model     = require('../model/db'),
    Promise   = require('bluebird'),
    _         = require('underscore');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/', function(req, res) {

    req.user.getCompany({
        include : [
            { model : model.User, as : 'users' },
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


module.exports = router;

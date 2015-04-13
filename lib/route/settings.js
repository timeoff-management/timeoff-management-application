/*
 *
 * */

"use strict";

var express = require('express');
var router  = express.Router();

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

    res.render('company', {
        title: 'Company settings',
        company : req.user.company,
    });
});


module.exports = router;

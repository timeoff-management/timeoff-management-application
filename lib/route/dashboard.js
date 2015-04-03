/*
 *
 * */

"use strict";

var express = require('express');
var router  = express.Router();

// Make sure that all handlers within Dashboard
// require authenticated users
router.all(/.*/, function (req, res, next) {

    if ( !req.session.passport.user ) {
        return res.redirect(303, '/');
    }

    next();
});

router.get('/', function(req, res) {

    res.render('dashboard', { title: 'Main dashboard' });
});

router.get('/foo/', function(req, res) {

    res.render('dashboard', { title: 'FOO' });
});


module.exports = router;

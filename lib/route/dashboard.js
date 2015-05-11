/*
 *
 * */

"use strict";

var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {

    var user = req.user;

    // if no user available in session show main public
    if (!user) {
        return res.render('index', { title : 'Time off management'});
    }

    res.render('dashboard', { title: 'Dashboard' });
});


// Make sure that all fallowing handlers Dashboard
// require authenticated users
router.all(/.*/, function (req, res, next) {

    if ( !req.user ) {
        return res.redirect_with_session(303, '/');
    }

    next();
});

router.get('/foo/', function(req, res) {

    res.render('dashboard', { title: 'FOO' });
});


module.exports = router;

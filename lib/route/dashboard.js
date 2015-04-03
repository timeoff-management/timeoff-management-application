/*
 *
 * */

"use strict";

var express = require('express');
var router  = express.Router();

/* GET home page. */
router.get('/', function(req, res) {

    if ( !req.session.passport.user ) {
        return res.redirect(303, '/');
    }

    res.render('dashboard', { title: 'Express' });
});

module.exports = router;



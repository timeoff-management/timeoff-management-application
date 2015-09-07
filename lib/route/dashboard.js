/*
 *
 * */

"use strict";

var express = require('express');
var router  = express.Router();
var ical = require('ical-generator');

router.get('/', function(req, res) {

    var user = req.user;

    // if no user available in session show main public
    if (!user) {
        return res.render('index', { title : 'Time off management'});
    }

    req.session.keep_old();
    res.redirect_with_session('./calendar/');
});

router.get('/ical.ics', function(req, res){

  var cal = ical({domain: 'github.com', name: 'my first iCal'});

  cal.createEvent({
      start       : new Date(),
      end         : new Date(new Date().getTime() + 3600000),
      summary     : 'Example Event',
      description : 'It works ;)',
  });

  cal.createEvent({
      start       : new Date(new Date().getTime() + 3600000),
      end         : new Date(new Date().getTime() + 3605000),
      summary     : 'Example Event 2',
      description : 'It works ;)',
  });


  res.send( cal.toString() );
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

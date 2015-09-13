
"use strict;";

var express = require('express'),
router      = express.Router(),
_           = require('underscore'),
moment      = require('moment'),
Promise     = require('bluebird'),
model       = require('../model/db'),
ical        = require('ical-generator');

router.get('/:token/ical.ics', function(req, res){

  var cal = ical({
    domain : 'timeoff.management',
  }),
      token = req.param('token'),
      user;

  Promise.resolve()
    .then(function(){
      return model.UserFeed.find({
        where : {feed_token : token},
        include : [
          {model : model.User, as : 'user'}
        ]
      });
    })
    .then(function(feed){
//      throw new Error("Unknown token provided");

      console.log('>>>> got a feed ' + feed.id);

      user = feed.user;

      return user.promise_calendar({ year : moment() });
    })
    .then(function(calendar){

      cal.name(user.full_name() + ' calendar');

      var days = _.flatten(
        _.map(calendar, function(cal){ return cal.as_for_wall_chart(); })
      );

      days.forEach(function(day){

        // We care only about days when employee is on leave
        if (!(day.is_leave_morning || day.is_leave_afternoon)) {
          return;
        }

        var start = moment(day.moment),
            end = moment(day.moment);

        if (day.is_leave_morning && day.is_leave_afternoon) {
          start.hour(9).minute(0);
          end.hour(17).minute(0);
        } else if (!day.is_leave_morning && day.is_leave_afternoon) {
          start.hour(13).minute(0);
          end.hour(17).minute(0);
        } else if (day.is_leave_morning && !day.is_leave_afternoon) {
          start.hour(9).minute(0);
          end.hour(13).minute(0);
        }

        cal.createEvent({
          start       : start.toDate(),
          end         : end.toDate(),
          summary     : user.full_name() + ' is out of office',
//          description : 'It works ;)',
        });
      });

      res.send( cal.toString() );
    })
    .catch(function(){
      // TODO VPP set 404 status
    });

});


module.exports = router;

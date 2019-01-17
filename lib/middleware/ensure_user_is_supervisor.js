/*
 * Midleware that checks if current session has a user and user is a supervisor
 *
 * In case of failure - redirects to the route.
 *
 * */
 _ = require('underscore'),

"use strict";

module.exports = function(req, res, next){
  // console.log(req.user);

  // User should be login to view settings pages
  if ( !req.user ) {
      return res.redirect_with_session(303, '/');
  }

  // Only Supervisors allowed to deal with settings pages. This checks which users
  // a supervisor can supervise/view/edit - only ones in their department.
  req.user.promise_users_I_can_manage()
  .then(function(users){
    var supervised_users = _.map(
        users,
        function(user){ return user.id; }
    )
    var userId = Number(req.params.user_id);

    // Take array of users a supervisor can manage, and check if the requested
    //  user in params.user_id is a user they can supervise, or self, because
    // supervisors should not be able to supervise themselves, only admin.
    if (supervised_users.indexOf(userId) < 0 || userId === req.user.id && !req.user.is_admin()) {
      req.session.flash_error("You need permission to do that. You can't manage yourself, or employees in other departments" );
      return res.redirect_with_session(303, '/');
    } else {
      next();
    }
  });
};

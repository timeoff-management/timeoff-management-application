/*
 * Midleware that checks if current session has a user and user is an admin.
 *
 * In case of failure - redirects to the route.
 *
 * */
"use strict";

module.exports = function(req, res, next){

    // User should be login to view settings pages
    if ( !req.user ) {
        return res.redirect(303, '/');
    }

    // Only Admin users allowed to deal with settings pages
    if ( !req.user.is_admin() ) {
        return res.redirect(303, '/');
    }

    next();
};

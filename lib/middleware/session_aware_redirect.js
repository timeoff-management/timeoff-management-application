
"use strict";

/*
  Because a bug in express-session middleware, when working
  with async stores we need explicitly wait until session
  changes are saved before proceeding farther, otherwise
  user ends up on next page quicker than session storage saves
  changes.

  More details are here: https://github.com/expressjs/session/pull/69

  Add new special redirect function to the res object to be session aware.

  TODO: Consider to completly substitute redirect function with new logic.
*/
module.exports = function(req, res, next){

   res.redirect_with_session = function(a,b){
        if (arguments.length === 2) {
            req.session.save(function(err){
                res.redirect(a,b);
            });
        } else {
            req.session.save(function(err){
                res.redirect(a);
            });
        }
        return true;
    };

    next();
};

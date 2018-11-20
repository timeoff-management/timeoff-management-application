
'use strict';

const
  express = require('express'),
  router  = express.Router();

module.exports = passport => {

  router.all(
    /.*/,
    passport.authenticate('bearer', { session: false }),
    (req, res, next) => {
      if ( req.isAuthenticated() ) {
        return next();
      }

      return res.status(401).json({ ok : false});
  });

  router.get(
    '/',
    (req, res) => res.json({ok : true})
  );

  router.get(
    '/report/allowance',
    (req, res) => {
    
      return res.json({foo : 'bar'});
    }
  );


  return router;
}

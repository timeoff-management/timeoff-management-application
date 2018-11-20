
'use strict';

const
  express = require('express'),
  router  = express.Router();

module.exports = passport => {

  router.get(
    '/',
    passport.authenticate('bearer', { session: false }),
    (req, res) => res.json({ok : true})
  );

  router.get(
    '/report/allowance',
    passport.authenticate('bearer', { session: false }),
    (req, res) => {
    
      return res.json({foo : 'bar'});
    }
  );


  return router;
}


"usse strict";

var express = require('express'),
    router  = express.Router();

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get(/email/, function(req, res){

  res.locals.custom_java_script.push(
    '/js/bootstrap-datepicker.js'
  );

  res.locals.custom_css.push(
      '/css/bootstrap-datepicker3.standalone.css'
  );

  var model = req.app.get('db_model');

  res.render('general_settings', {
  });
});

module.exports = router;


"use strict";

const
  express   = require('express'),
  router    = express.Router(),
  Exception = require('../../error'),
  Promise   = require('bluebird');

router.get('/summary/:userId/', (req, res) => {

  const requestor = req.user;
  const userId = req.params.userId;

  // Get user object by provided ID
  let flow = req.app.get('db_model').User.find_by_id(userId);

  // Ensure that requestor and user belong to the same company
  flow = flow.then(user => {
    if (!user || user.companyId !== requestor.companyId) {
      throw Exception.throwUserError({
        user_error: 'No access to given user',
        system_error: `User ${requestor.id} tried to access details of user ${userId}: either ID does not belong to existing user of requestor and Id does not share company`,
      });
    }

    return Promise.resolve(user);
  });

  // Get all users requestor can manage
  // If requestor is admin OR is manager for given user show detailed INFO
  flow = flow.then(user => requestor.promise_supervised_users().then(users => {
    if (users.filter(u => u.id === user.id).length !== 1) {
      return Promise.resolve({user});
    }

    return Promise.resolve({user, isDetailed: true});
  }));

  flow = flow.then(({user, isDetailed}) => {
    if (isDetailed) {

    } else {

    }

    res.render('user/popup_user_details', {
      layout: false,
      user: {
        fullName: user.full_name(),
      },
    });
  });


  flow.catch(error => {
    console.log(error);
    res.send('Failed to get user details...');
  });

});

module.exports = router;


'use strict';

const
  openPageFunc   = require('./open_page'),
  userInfoFunc   = require('./user_info'),
  submitFormFunc = require('./submit_form'),
  config           = require('./config'),
  bluebird         = require('bluebird'),
  moment           = require('moment');

const getUserId = ({userId,email,driver}) => (!!userId)
  ? bluebird.resolve(userId)
  : userInfoFunc({email,driver})
    .then(({user : {id}}) => bluebird.resolve(id));

module.exports = ({
  driver,
  email,
  userId=null,
  year=moment.utc().year(),
  applicationHost=config.get_application_host()}
) =>
  getUserId({userId,email,driver})
    .then(userId => openPageFunc({driver, url:`${applicationHost}users/edit/${userId}/`}))
    .then(() => submitFormFunc({
      driver,
      form_params : [{
        selector : 'input#start_date_inp',
        value    : `${year}-01-01`,
      }],
      submit_button_selector : 'button#save_changes_btn',
      message : /Details for .* were updated/,
    }))
    .then(() => bluebird.resolve({driver}));



'use strict';

const
  { throwUserError } = require('../error'),
  Promise = require('bluebird');

module.exports = ({token, model}) => {

  if ( ! token ) {
    throwUserError({
      system_error : "Provided token has FALSY value",
      user_error : "Wrong access token",
    });
  }

  let action = model.Company.getCompanyByApiToken({ token });

  action = action.then(company => {
    if ( ! company ) {
      throwUserError({
        system_error: `Cannot find company record for provided token ${token}`,
        user_error: 'Wrong access token',
      });
    }

    const [adminUser] = company.get('users').filter(u => u.is_admin());

    if ( ! adminUser) {
      throwUserError({
        system_error: `Failed to find admin users for company ${ company.id }`,
        user_error: 'Wrong access token',
      });
    }

    return Promise.resolve(adminUser);
  });

  return action;
};

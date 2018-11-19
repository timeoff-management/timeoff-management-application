
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

  return Promise.resolve({id: 123});
};

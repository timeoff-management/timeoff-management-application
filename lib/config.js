
'use strict';

var nconf     = require('nconf');
var appConfig = require('../config/app.json');

nconf
  .argv()
  .file('localisation', { file: __dirname+'/../config/localisation.json' })
  .overrides(appConfig);

module.exports = nconf;

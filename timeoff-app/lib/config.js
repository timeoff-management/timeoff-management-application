
'use strict';

var nconf = require('nconf');

nconf
  .argv()
  .file('localisation', { file: __dirname+'/../config/localisation.json' })
  .file({ file: __dirname+'/../config/app.json' });

module.exports = nconf;


'use strict';

var nconf = require('nconf');

nconf
  .argv()
  .env('__')
  .file('db', { file: __dirname+'/../config/db.json' })
  .file('localisation', { file: __dirname+'/../config/localisation.json' })
  .file({ file: __dirname+'/../config/app.json' });

module.exports = nconf;


"use strict;";

var nconf = require('nconf');

nconf
  .argv()
  .file({ file: __dirname+'/../config/app.json' });

module.exports = nconf;

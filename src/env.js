'use strict';

var env;

if (process.env.FREEAB_ENV) {
  env = process.env.FREEAB_ENV;
} else if (process.argv.slice(2)[0]) {
  env = process.argv.slice(2)[0];
} else {
  env = 'test';
}

if (! (   env === 'test'
       || env === 'dev'
       || env === 'staging'
       || env === 'production')) {
  throw new Error('"' + env + '" is not an allowed environment');
}

module.exports = env;

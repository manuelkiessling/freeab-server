'use strict';

var env;

if (process.env.FREEAB_ENV) {
  env = process.env.FREEAB_ENV;
} else if (process.argv.slice(2)[0]) {
  env = process.argv.slice(2)[0];
} else {
  env = 'test';
}

module.exports = env;

'use strict'

const nconf = require('nconf')

nconf
  .argv()
  .env({
    separator: '_',
    lowerCase: true
  })
  .file('localisation', { file: __dirname + '/../config/localisation.json' })
  .file({ file: __dirname + '/../config/app.json' })
  .defaults({
    slack: {
      token: '',
      icon_url: '',
      bot_name: ''
    },
    login: {
      default: true
    },
    google: {
      clientID: '123',
      clientSecret: '123'
    },
    smtp: {
      host: 'localhost',
      port: 25,
      from: 'email@test.com',
      auth: {
        user: '',
        pass: ''
      }
    },
    sessionStore: {
      useRedis: false,
      redisConnectionConfiguration: {
        host: 'localhost',
        port: 6379
      }
    },
    ga_tracker: '',
    crypto_secret: '!2~`HswpPPLa22+=±§sdq qwe,appp qwwokDF_',
    application_domain: 'http://app.timeoff.management',
    promotion_website_domain: 'http://timeoff.management',
    locale_code_for_sorting: 'en',
    allow_create_new_accounts: true,
    force_to_explicitly_select_type_when_requesting_new_leave: false
  })

module.exports = nconf

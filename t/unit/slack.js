'use strict'

const expect = require('chai').expect;
  const _ = require('underscore');
  const bluebird = require('bluebird');
  const Slack = require('../../lib/email')

describe('Check Slack', function() {
  it('Knows how to render and parse template', function(done) {
    var Slack = new Slack()

    bluebird
      .resolve(
        Slack.promise_rendered_slack_template({
          template_name: 'foobar',
          context: {
            user: {
              name: 'FOO',
              reload_with_session_details: function() {
                bluebird.resolve(1)
              }
            }
          }
        })
      )
      .then(function(email) {
        expect(Slack.text).to.match(/Hello FOO\./)

        done()
      })
  })
})

'use strict'

const expect = require('chai').expect;
  const _ = require('underscore');
  const bluebird = require('bluebird');
  const Email = require('../../lib/email')

describe('Check Email', function() {
  it('Knows how to render and parse template', function(done) {
    const email = new Email()

    bluebird
      .resolve(
        email.promise_rendered_email_template({
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
        expect(email.subject).to.be.equal('Email subject goes here')
        expect(email.body).to.match(/Hello FOO\./)

        done()
      })
  })
})

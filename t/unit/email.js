"use strict";

var expect = require("chai").expect,
  _ = require("underscore"),
  bluebird = require("bluebird"),
  Email = require("../../lib/email");

describe("Check Email", function() {
  it("Knows how to render and parse template", function(done) {
    var email = new Email();

    bluebird
      .resolve(
        email.promise_rendered_email_template({
          template_name: "foobar",
          context: {
            user: {
              name: "FOO",
              reload_with_session_details: function() {
                bluebird.resolve(1);
              }
            }
          }
        })
      )
      .then(function(email) {
        expect(email.subject).to.be.equal("Email subject goes here");
        expect(email.body).to.match(/Hello FOO\./);

        done();
      });
  });
});

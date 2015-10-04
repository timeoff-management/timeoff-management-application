
'use strict';

var expect = require('chai').expect,
_          = require('underscore'),
bluebird   = require('bluebird'),
Email      = require('../../lib/email');

describe('Check Email', function(){

  it('Knows how to render and parse template', function(done){

    var email = new Email();

    bluebird.resolve(email.promise_rendered_email_template({
      template_name : 'foobar',
      context : {user : {name : 'FOO'}}
    }))
    .then(function(email){

      expect(email.subject).to.be.equal('Email subject goes here');
      expect(email.body).to.match(/Hello FOO\./);

      done();
    });

  });
});


describe('TEMP', function(){


  it('foobar', function(done){

    var email = new Email();

    bluebird.resolve(email.promise_registration_email({
      user : { name : "pavlo"},
    }))
    .then(function(){
      console.log('done');
      done();
    });

  });

});

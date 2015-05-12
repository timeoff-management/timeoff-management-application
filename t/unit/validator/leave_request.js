
'use strict';

var expect  = require('chai').expect,
    _       = require('underscore'),
    MockExpressReq          = require('../../lib/mock_express_request'),
    leave_request_validator = require('../../../lib/route/validator/leave_request');


describe('Check validation for leave request', function(){

    it('No parameters provided', function(){
        var req = new MockExpressReq({});

        expect(function(){
            leave_request_validator({req : req})
        }).to.throw('Got validation errors');

        expect( req.session.flash.errors.length ).to.be.equal( 5 );
    });

});

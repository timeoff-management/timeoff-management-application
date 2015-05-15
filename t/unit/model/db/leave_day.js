
'use strict';

var expect  = require('chai').expect,
    _       = require('underscore'),
    model   = require('../../../../lib/model/db');

var default_params = {
    from_date      : '2015-04-09',
    to_date        : '2015-04-10',
    leave          : { id : 1 },
    from_date_part : 1,
    to_date_part   : 1,
};


describe('Check get_objects_for_bulk_create', function(){

    it('Mandatory parameters are checked', function(){
        expect(function(){
            model.LeaveDay.get_objects_for_bulk_create({});
        }).to.throw("No mandatory from_date was provided");
    });


    it('Start date is not greater then end', function(){

        var params = _.clone(default_params);
        params.from_date = '2015-04-10';
        params.to_date   = '2015-04-09';

        expect(function(){
            model.LeaveDay.get_objects_for_bulk_create( params );
        })
    });

    it('Check case when start and finish dates are the same', function(){

        var params = _.clone(default_params);
        params.from_date = '2015-04-09';
        params.to_date   = '2015-04-09';

        expect(
            model.LeaveDay.get_objects_for_bulk_create( params )
        ).to.be.eql([{
            date     : '2015-04-09',
            day_part : 1,
            LeaveId  : 1,
        }]);
    });

    it('Start and end dates are the same, and half day', function(){

        var params = _.clone(default_params);
        params.from_date      = '2015-04-09';
        params.to_date        = '2015-04-09';
        params.from_date_part = 3;
        // finish date part setting is ignored if both dates are the sane
        params.to_date_part   = 1;

        expect(
            model.LeaveDay.get_objects_for_bulk_create( params )
        ).to.be.eql([{
            date     : '2015-04-09',
            day_part : 3,
            LeaveId  : 1,
        }]);
    });

    it('Two days in a row', function(){
        var params = _.clone(default_params);

        expect(
            model.LeaveDay.get_objects_for_bulk_create( params )
        ).to.be.eql([{
            date     : '2015-04-09',
            day_part : 1,
            LeaveId  : 1,
        },{
            date : '2015-04-10',
            day_part : 1,
            LeaveId  : 1,
        }]);
    });

    it('Three days in a row with first half day', function(){
        var params = _.clone( default_params );
        params.to_date = '2015-04-11';
        params.from_date_part = 3;

        expect(
            model.LeaveDay.get_objects_for_bulk_create( params )
        ).to.be.eql([{
            date     : '2015-04-09',
            day_part : 3,
            LeaveId  : 1,
        },{
            date : '2015-04-10',
            day_part : 1,
            LeaveId  : 1,
        },{
            date : '2015-04-11',
            day_part : 1,
            LeaveId  : 1,
        }]);
    });

});

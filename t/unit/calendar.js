
'use strict';

var expect  = require('chai').expect,
    _       = require('underscore'),
    CalendarMonth = require('../../lib/model/calendar_month');


describe('Check calendar month object', function(){

    it('Normalize provided date to be at the begining of the month',function(){
        var january = new CalendarMonth('2015-01-10');

        expect(
            january.get_base_date().date()
        ).to.be.equal(1);
    });

    it('Knows on which week day month starts', function(){
        var january = new CalendarMonth('2015-01-21');
        expect( january.week_day() ).to.be.equal(4);

        var feb = new CalendarMonth('2015-02-21');
        expect( feb.week_day() ).to.be.equal(7);
    });

    it('Knows how many blanks to put before first day of the month', function(){
        var january = new CalendarMonth('2015-01-11');
        expect( january.how_many_blanks_at_the_start() ).to.be.equal(3);

        var feb = new CalendarMonth('2015-02-11');
        expect( feb.how_many_blanks_at_the_start() ).to.be.equal(6);
    });

    it('Knows how many blanks to put after the last day of the month', function(){
        var january = new CalendarMonth('2015-01-11');
        expect( january.how_many_blanks_at_the_end() ).to.be.equal(1);

        var feb = new CalendarMonth('2015-02-11');
        expect( feb.how_many_blanks_at_the_end() ).to.be.equal(1);
    });

    it('Knows whether day is weekend', function(){
        var feb = new CalendarMonth('2015-02-12');
        expect(feb.is_weekend(12)).not.to.be.ok;
        expect(feb.is_weekend(21)).to.be.ok;
        expect(feb.is_weekend(22)).to.be.ok;
        expect(feb.is_weekend(23)).not.to.be.ok;
    });

    it('Knows how to generate data structure for template', function(){
        var january = new CalendarMonth('2015-01-11'),
          object_to_test = january.as_for_template();
        delete object_to_test['moment'];
        expect( object_to_test ).to.be.eql(
            {"month":"January","weeks":[[{"val":""},{"val":""},{"val":""},{"val":1},{"val":2},{"val":3,"is_weekend":true},{"val":4,"is_weekend":true}],[{"val":5},{"val":6},{"val":7},{"val":8},{"val":9},{"val":10,"is_weekend":true},{"val":11,"is_weekend":true}],[{"val":12},{"val":13},{"val":14},{"val":15},{"val":16},{"val":17,"is_weekend":true},{"val":18,"is_weekend":true}],[{"val":19},{"val":20},{"val":21},{"val":22},{"val":23},{"val":24,"is_weekend":true},{"val":25,"is_weekend":true}],[{"val":26},{"val":27},{"val":28},{"val":29},{"val":30},{"val":31,"is_weekend":true},{"val":""}]]}
        );


        var apr = new CalendarMonth('2015-04-11');
        object_to_test = apr.as_for_template();
        delete object_to_test['moment'];
        expect( object_to_test ).to.be.eql(
            {"month":"April","weeks":[[{"val":""},{"val":""},{"val":1},{"val":2},{"val":3},{"val":4,"is_weekend":true},{"val":5,"is_weekend":true}],[{"val":6},{"val":7},{"val":8},{"val":9},{"val":10},{"val":11,"is_weekend":true},{"val":12,"is_weekend":true}],[{"val":13},{"val":14},{"val":15},{"val":16},{"val":17},{"val":18,"is_weekend":true},{"val":19,"is_weekend":true}],[{"val":20},{"val":21},{"val":22},{"val":23},{"val":24},{"val":25,"is_weekend":true},{"val":26,"is_weekend":true}],[{"val":27},{"val":28},{"val":29},{"val":30},{"val":""},{"val":""},{"val":""}]]}
        );

    });


    it('Sanity checks pass', function(){

        var apr = new CalendarMonth('2015-04-01');

        expect(apr).to.be.a('object');

        expect(apr.how_many_days()).to.be.equal(30);
    });

    it('It knows whether day is bank holiday', function(){
        var mar = new CalendarMonth('2015-03-19', { bank_holidays : ['2015-03-08'] });

        expect(mar.is_bank_holiday(8)).to.be.ok;
        expect(mar.is_bank_holiday(10)).not.to.be.ok;
    });

});


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

    it('Knows how to generate data structure for template', function(){
        var january = new CalendarMonth('2015-01-11');
        expect( january.as_for_template() ).to.be.eql(
            {"month":"January","weeks":[["","","",1,2,3,4],[5,6,7,8,9,10,11],[12,13,14,15,16,17,18],[19,20,21,22,23,24,25],[26,27,28,29,30,31,""]]}
        );


        var apr = new CalendarMonth('2015-04-11');
        expect( apr.as_for_template() ).to.be.eql(
            {"month":"April","weeks":[["","",1,2,3,4,5],[6,7,8,9,10,11,12],[13,14,15,16,17,18,19],[20,21,22,23,24,25,26],[27,28,29,30,"","",""]]}
        );

    });


    it('Sanity checks pass', function(){
    
        var apr = new CalendarMonth('2015-04-01');

        expect(apr).to.be.a('object');

        expect(apr.how_many_days()).to.be.equal(30);
    });

});

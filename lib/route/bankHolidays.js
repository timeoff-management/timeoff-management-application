
"use strict";

const express = require('express'),
  moment = require('moment'),
  router    = express.Router(),
  validator = require('validator'),
  CalendarMonth       = require('../model/calendar_month');

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'));

router.get('/bankholidays_v2/', (req, res) => {

  const currentYear = (
    validator.isNumeric(req.query['year'])
    ? moment.utc(req.query['year'], 'YYYY')
    : req.user.company.get_today()
  ).year();


  req.user.getCompany({
    scope : ['with_bank_holidays'],
  })
  .then((company) => {
    const today = moment.utc();
    const calendar = [...Array(12).keys()]
      .map(i => i+1)
      .map(m => new CalendarMonth(
          `${currentYear}-${m}`,
          {
            today,
            schedule: {is_it_working_day: ({day}) => moment.utc(day).isoWeekday() < 6},
            bank_holidays: company.bank_holidays,
          }
        )
      )
      .map(cm => cm.as_for_template());

    res.render('bankHolidays', {
      company,
      calendar,
      yearCurrent: currentYear,
      yearPrev: currentYear - 1,
      yearNext: currentYear + 1,
    });
  });
});

router.post('/bankholidays_v2/', function(req,res){
    var name = validator.trim(req.body['name']),
        date = validator.trim(req.body['date']),
        model= req.app.get('db_model');

    req.user.getCompany({
        include : [{ model : model.BankHoliday, as : 'bank_holidays' }],
        order : [[{model: model.BankHoliday, as : 'bank_holidays'}, 'date' ]],
    })
    .then(function(company){

        var promise_new_bank_holiday = Promise.resolve(1);

        if (validator.trim(req.body['name__new'])) {
            var attributes = get_and_validate_bank_holiday({
                req       : req,
                suffix    : 'new',
                item_name : 'New Bank Holiday'
            });
            if ( req.session.flash_has_errors() ) {
                return Promise.resolve(1);
            }
            attributes.companyId = company.id;
            promise_new_bank_holiday = model.BankHoliday.create(attributes);

        }

        return Promise.all([
            promise_new_bank_holiday,
            _.map(

            company.bank_holidays,
            function(bank_holiday, index){

                  var attributes = get_and_validate_bank_holiday({
                      req       : req,
                      suffix    : index,
                      item_name : bank_holiday.name,
                  });

                  // If there were any validation errors: do not update bank holiday
                  // (it affects all bank holidays, that is if one failed
                  // validation - all bank holidays are not to be updated)
                  if ( req.session.flash_has_errors() ) {
                      return Promise.resolve(1);
                  }

                  return bank_holiday.updateAttributes(attributes);
              }

            ) // End of map that create bank_holiday update promises
        ]);
    })
    .then(function(){

        if ( req.session.flash_has_errors() ) {
            return res.redirect_with_session('/settings/general/');
        } else {
            req.session.flash_message('Changes to bank holidays were saved');
            return res.redirect_with_session('/settings/general/');
        }
    })
    .catch(function(error){
        console.error(
            'An error occurred when trying to edit Bank holidays by user '+req.user.id
            + ' : ' + error
        );

        req.session.flash_error(
            'Failed to update bank holidayes details, please contact customer service'
        );

        return res.redirect_with_session('/settings/general/');
    });

});

router.post('/bankholidays_v2/import/', (req, res) => {
  let model = req.app.get('db_model'),
    config_countries = config.get('countries');

  Promise
    .try(() => req.user.getCompany({
      scope : ['with_bank_holidays'],
    }))
    .then(company => {

      // re-organize existing bank holiday in look up map manner
      let existing_bank_holidays_map = {};
      company.bank_holidays.forEach(bh => {
        existing_bank_holidays_map[ company.normalise_date(bh.date) ] = 1;
      });

      // Fetch all default bank holidays known for current contry
      let bank_holidays_to_import =
        config_countries[ (company.country || 'GB') ].bank_holidays;

      // prepare list of bank holidays that needs to be added
      bank_holidays_to_import = bank_holidays_to_import

        // Ignore those which dates already used
        .filter(bh => ! existing_bank_holidays_map.hasOwnProperty( company.normalise_date( bh.date ) ))
        // and transform bank holidays into import friendly structure
        .map(
          bh => ({ name : bh.name, date : bh.date, companyId : company.id })
        );

      return model.BankHoliday.bulkCreate( bank_holidays_to_import );
    })
    .then( created_bank_holidays => {

      if ( created_bank_holidays.length && created_bank_holidays.length > 0) {
        req.session.flash_message(
          'New bank holidays were added: '
          + created_bank_holidays.map(bh => bh.name).join(', ')
        );
      } else {

        req.session.flash_message('No more new bank holidays exist');
      }

      return res.redirect_with_session('/settings/general/');
    })
    .catch(error => {

      console.log(
        'An error occurred when trying to import default bank holidays by user '+req.user.id
      );
      console.dir(error);

      if ( error && error.tom_error) {
        req.session.flash_error( Exception.extract_user_error_message(error) );
      }

      req.session.flash_error(
        'Failed to import bank holidays'
      );

      return res.redirect_with_session('/settings/general/');
    });
});

router.post('/bankholidays_v2/delete/:bank_holiday_number/', function(req, res){

    // bank_holiday_number is a index number of bank_holiday to be removed based
    // on the list of bank holidays on the page, this is not an ID
    var bank_holiday_number = req.params['bank_holiday_number'];

    var model = req.app.get('db_model');

    if (!validator.isInt(bank_holiday_number)) {
        console.error(
            'User '+req.user.id+' submited non-int bank holiday number '
                +bank_holiday_number
        );

        req.session.flash_error('Cannot remove bank holiday: wronge parameters');

        return res.redirect_with_session('/settings/general/');
    }

    req.user.getCompany({
        include : [{ model : model.BankHoliday, as : 'bank_holidays' }],
        order : [[{model: model.BankHoliday, as : 'bank_holidays'}, 'date' ]],
    })
    .then(function(company){
        var bank_holiday_to_remove = company.bank_holidays[ bank_holiday_number ];

        // Check if user specify valid department number
        if (! bank_holiday_to_remove) {

            console.error(
                'User '+req.user.id+' tried to remove non-existing bank holiday number'
                +bank_holiday_number+' out of '+company.bank_holidays.length
            );

            req.session.flash_error('Cannot remove bank holiday: wronge parameters');

            return res.redirect_with_session('/settings/general/');
        }

        return bank_holiday_to_remove.destroy();
    })
    .then(function(){
        req.session.flash_message('Bank holiday was successfully removed');
        return res.redirect_with_session('/settings/general/');
    });
});


module.exports = router;

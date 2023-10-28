'use strict'

const express = require('express')
const moment = require('moment')
const router = express.Router()
const validator = require('validator')
const Promise = require('bluebird')
const config = require('../config')
const CalendarMonth = require('../model/calendar_month')
const Exception = require('../error')

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require('../middleware/ensure_user_is_admin'))

const getCurrentYear = ({ req }) => {
  const rawYear = req.query.year || req.body.year || ''
  return (validator.isNumeric(rawYear)
    ? moment.utc(rawYear, 'YYYY')
    : req.user.company.get_today()
  ).year()
}

router.get('/bankholidays/', (req, res) => {
  res.locals.custom_java_script.push('/js/bank_holidays.js')

  const currentYear = getCurrentYear({ req })
  const model = req.app.get('db_model')
  req.user
    .getCompany({
      include: [{ model: model.BankHoliday, as: 'bank_holidays' }],
      order: [[{ model: model.BankHoliday, as: 'bank_holidays' }, 'date']]
    })
    .then(company => {
      const today = moment.utc()
      const bankHolidays = company.bank_holidays.filter(
        bh => moment.utc(bh.date).year() === currentYear
      )

      const calendar = [...Array(12).keys()]
        .map(i => i + 1)
        .map(
          m =>
            new CalendarMonth(`${currentYear}-${m}`, {
              today,
              schedule: {
                is_it_working_day: ({ day }) => moment.utc(day).isoWeekday() < 6
              },
              bank_holidays: bankHolidays
            })
        )
        .map(cm => cm.as_for_template())

      res.render('bankHolidays', {
        company,
        calendar,
        bankHolidays,
        yearCurrent: currentYear,
        yearPrev: currentYear - 1,
        yearNext: currentYear + 1,
        startDateOfYearCurrent: moment.utc(currentYear, 'YYYY')
      })
    })
})

router.post('/bankholidays/', (req, res) => {
  const model = req.app.get('db_model')
  const currentYear = getCurrentYear({ req })

  req.user
    .getCompany({
      scope: ['with_bank_holidays']
    })
    .then(company => {
      /**
       * Validate input first
       */
      const allBankHolidays = company.bank_holidays
        .filter(
          bankHoliday => req.body[`date__${bankHoliday.id}`] !== undefined
        )
        .map(bankHoliday => {
          bankHoliday.name =
            req.body[`name__${bankHoliday.id}`] || bankHoliday.name
          bankHoliday.date =
            req.body[`date__${bankHoliday.id}`] || bankHoliday.date
          return bankHoliday
        })

      // Add the new bank holiday to the list if exists.
      if (req.body.name__new && validator.trim(req.body.name__new)) {
        allBankHolidays.push({
          name: req.body.name__new,
          date: req.body.date__new,
          company_id: company.id
        })
      }

      // Validation
      const invalidBankHolidays = allBankHolidays.filter(bankHoliday => {
        const date = company.normalise_date(bankHoliday.date)
        return !validator.isDate(date)
      })

      // Handle errors
      if (invalidBankHolidays.length > 0) {
        invalidBankHolidays.forEach(bankHoliday =>
          req.session.flash_error(
            `New day for ${bankHoliday.name} should be date`
          )
        )
        // If there were any validation errors: do not update bank holiday
        // (it affects all bank holidays, that is if one failed
        // validation - all bank holidays are not to be updated)
        return Promise.reject(new Error('bad_request'))
      }

      // All good, save all
      return Promise.all([
        ...allBankHolidays.map(bankHoliday => {
          // Create
          if (!bankHoliday.id) {
            return model.BankHoliday.create(bankHoliday)
          }

          // Update
          return bankHoliday.update({
            name: bankHoliday.name,
            date: bankHoliday.date
          })
        })
      ])
    })
    .then(() => {
      req.session.flash_message('Changes to bank holidays were saved!')
      res.redirect_with_session(`/settings/bankholidays/?year=${currentYear}`)
    })
    .catch(error => {
      console.error(
        `An error occurred when trying to edit Bank holidays by user [${
          req.user.id
        }]: ${error}`
      )
      console.log(error)

      req.session.flash_error(
        'Failed to update bank holidays, please contact customer service'
      )
      res.redirect_with_session(`/settings/bankholidays/?year=${currentYear}`)
    })
})

router.post('/bankholidays/import/', (req, res) => {
  const model = req.app.get('db_model')
  const config_countries = config.get('countries')
  const currentYear = getCurrentYear({ req })

  Promise.try(() =>
    req.user.getCompany({
      scope: ['with_bank_holidays']
    })
  )
    .then(company => {
      // re-organize existing bank holiday in look up map manner
      const existing_bank_holidays_map = {}
      company.bank_holidays.forEach(bh => {
        existing_bank_holidays_map[company.normalise_date(bh.date)] = 1
      })

      // Fetch all default bank holidays known for current country
      let bank_holidays_to_import =
        config_countries[company.country || 'GB'].bank_holidays

      // prepare list of bank holidays that needs to be added
      bank_holidays_to_import = bank_holidays_to_import

        // Ignore those which dates already used
        .filter(
          bh =>
            !existing_bank_holidays_map.hasOwnProperty(
              company.normalise_date(bh.date)
            )
        )
        // Ignore those from another years
        .filter(bh => moment.utc(bh.date).year() === currentYear)
        // and transform bank holidays into import friendly structure
        .map(bh => ({ name: bh.name, date: bh.date, company_id: company.id }))

      return model.BankHoliday.bulkCreate(bank_holidays_to_import)
    })
    .then(created_bank_holidays => {
      if (!created_bank_holidays.length || created_bank_holidays.length <= 0) {
        req.session.flash_message('No more new bank holidays exist')
        return
      }

      req.session.flash_message(
        'New bank holidays were added: ' +
          created_bank_holidays.map(bh => bh.name).join(', ')
      )
    })
    .then(() =>
      res.redirect_with_session(`/settings/bankholidays/?year=${currentYear}`)
    )
    .catch(error => {
      console.log(
        'An error occurred when trying to import default bank holidays by user ' +
          req.user.id
      )
      console.dir(error)

      if (error && error.tom_error) {
        req.session.flash_error(Exception.extract_user_error_message(error))
      }

      req.session.flash_error('Failed to import bank holidays')
    })
})

router.post('/bankholidays/delete/:bankHolidayId/', (req, res) => {
  const currentYear = getCurrentYear({ req })
  const bankHolidayId = req.params.bankHolidayId

  if (
    typeof bankHolidayId !== 'number' &&
    (!bankHolidayId || !validator.isInt(bankHolidayId))
  ) {
    console.error(
      `User ${req.user.id} submitted non-INT bank holiday ID ${bankHolidayId}`
    )
    req.session.flash_error('Cannot remove bank holiday: wrong parameters')
    return res.redirect_with_session(
      `/settings/bankholidays/?year=${currentYear}`
    )
  }

  req.user
    .getCompany({
      scope: ['with_bank_holidays']
    })
    .then(company => {
      const bankHolidayToRemove = company.bank_holidays.find(
        bh => String(bh.id) === String(bankHolidayId)
      )

      // Check if user specify valid department number
      if (!bankHolidayToRemove) {
        return Promise.reject(new Error('Unable to remove the bank holiday.'))
      }

      return bankHolidayToRemove.destroy()
    })
    .then(() => {
      req.session.flash_message('Bank holiday was successfully removed')
      return res.redirect_with_session(
        `/settings/bankholidays/?year=${currentYear}`
      )
    })
    .catch(error => {
      console.error(
        `User ${
          req.user.id
        } tried to remove non-existing bank holiday number ${bankHolidayId}`
      )
      console.log('Error: ', error)
      req.session.flash_error('Cannot remove bank holiday: wrong parameters')

      res.redirect_with_session(`/settings/bankholidays/?year=${currentYear}`)
    })
})

module.exports = router

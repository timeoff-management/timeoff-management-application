"use strict";

const express = require("express"),
  moment = require("moment"),
  router = express.Router(),
  validator = require("validator"),
  Promise = require("bluebird"),
  config = require("../config"),
  CalendarMonth = require("../model/calendar_month");

// Make sure that current user is authorized to deal with settings
router.all(/.*/, require("../middleware/ensure_user_is_admin"));

const getCurrentYear = ({ req }) => {
  const rawYear = req.query["year"] || req.body["year"];
  return (
    validator.isNumeric(rawYear)
      ? moment.utc(rawYear, "YYYY")
      : req.user.company.get_today()
  ).year();
};

router.get("/bankholidays/", (req, res) => {
  res.locals.custom_java_script.push("/js/bank_holidays.js");

  const currentYear = getCurrentYear({ req });

  req.user
    .getCompany({
      scope: ["with_bank_holidays", "order_by_bank_holidays"],
    })
    .then((company) => {
      const today = moment.utc();
      const bankHolidays = company.bank_holidays.filter(
        (bh) => moment.utc(bh.date).year() === currentYear
      );
      const calendar = [...Array(12).keys()]
        .map((i) => i + 1)
        .map(
          (m) =>
            new CalendarMonth(`${currentYear}-${m}`, {
              today,
              schedule: {
                is_it_working_day: ({ day }) =>
                  moment.utc(day).isoWeekday() < 6,
              },
              bank_holidays: bankHolidays,
            })
        )
        .map((cm) => cm.as_for_template());

      res.render("bankHolidays", {
        company,
        calendar,
        bankHolidays,
        yearCurrent: currentYear,
        yearPrev: currentYear - 1,
        yearNext: currentYear + 1,
        startDateOfYearCurrent: moment.utc(currentYear, "YYYY"),
      });
    });
});

const promiseNewBankHoliday = ({ model, req, companyId }) => {
  if (!validator.trim(req.body["name__new"])) {
    return Promise.resolve(1);
  }

  const attributes = getAndValidateBankHoliday({
    req,
    id: "new",
    itemName: "New Bank Holiday",
  });

  if (req.session.flash_has_errors()) {
    return Promise.resolve(1);
  }

  return model.BankHoliday.create({ ...attributes, companyId });
};

router.post("/bankholidays/", function (req, res) {
  const model = req.app.get("db_model");
  const currentYear = getCurrentYear({ req });

  req.user
    .getCompany({
      scope: ["with_bank_holidays"],
    })
    .then((company) => {
      return Promise.all([
        promiseNewBankHoliday({ model, req, companyId: company.id }),
        ...company.bank_holidays.map((bankHoliday) => {
          const attributes = getAndValidateBankHoliday({
            req,
            id: bankHoliday.id,
            itemName: bankHoliday.name,
          });

          // If there were any validation errors: do not update bank holiday
          // (it affects all bank holidays, that is if one failed
          // validation - all bank holidays are not to be updated)
          if (req.session.flash_has_errors()) {
            return Promise.resolve(1);
          }

          return bankHoliday.updateAttributes(attributes);
        }),
      ]);
    })
    .then(() => {
      if (!req.session.flash_has_errors()) {
        req.session.flash_message("Changes to bank holidays were saved");
      }
    })
    .catch((error) => {
      console.error(
        `An error occurred when trying to edit Bank holidays by user [${req.user.id}]: ${error}`
      );

      req.session.flash_error(
        "Failed to update bank holidays, please contact customer service"
      );
    })
    .then(() => {
      return res.redirect_with_session(
        `/settings/bankholidays/?year=${currentYear}`
      );
    });
});

router.post("/bankholidays/import/", (req, res) => {
  const model = req.app.get("db_model"),
    config_countries = config.get("countries"),
    currentYear = getCurrentYear({ req });

  Promise.try(() =>
    req.user.getCompany({
      scope: ["with_bank_holidays"],
    })
  )
    .then((company) => {
      // re-organize existing bank holiday in look up map manner
      let existing_bank_holidays_map = {};
      company.bank_holidays.forEach((bh) => {
        existing_bank_holidays_map[company.normalise_date(bh.date)] = 1;
      });

      // Fetch all default bank holidays known for current country
      let bank_holidays_to_import =
        config_countries[company.country || "GB"].bank_holidays;

      // prepare list of bank holidays that needs to be added
      bank_holidays_to_import = bank_holidays_to_import

        // Ignore those which dates already used
        .filter(
          (bh) =>
            !existing_bank_holidays_map.hasOwnProperty(
              company.normalise_date(bh.date)
            )
        )
        // Ignore those from another years
        .filter((bh) => moment.utc(bh.date).year() === currentYear)
        // and transform bank holidays into import friendly structure
        .map((bh) => ({ name: bh.name, date: bh.date, companyId: company.id }));

      return model.BankHoliday.bulkCreate(bank_holidays_to_import);
    })
    .then((created_bank_holidays) => {
      if (created_bank_holidays.length && created_bank_holidays.length > 0) {
        req.session.flash_message(
          "New bank holidays were added: " +
            created_bank_holidays.map((bh) => bh.name).join(", ")
        );
      } else {
        req.session.flash_message("No more new bank holidays exist");
      }
    })
    .catch((error) => {
      console.log(
        "An error occurred when trying to import default bank holidays by user " +
          req.user.id
      );
      console.dir(error);

      if (error && error.tom_error) {
        req.session.flash_error(Exception.extract_user_error_message(error));
      }

      req.session.flash_error("Failed to import bank holidays");
    })
    .then(() => {
      return res.redirect_with_session(
        `/settings/bankholidays/?year=${currentYear}`
      );
    });
});

router.post("/bankholidays/delete/:bankHolidayId/", function (req, res) {
  const currentYear = getCurrentYear({ req });
  const bankHolidayId = req.params["bankHolidayId"];

  if (!validator.isInt(bankHolidayId)) {
    console.error(
      `User ${req.user.id} submitted non-INT bank holiday ID ${bankHolidayId}`
    );
    req.session.flash_error("Cannot remove bank holiday: wrong parameters");
    return res.redirect_with_session(
      `/settings/bankholidays/?year=${currentYear}`
    );
  }

  req.user
    .getCompany({
      scope: ["with_bank_holidays"],
    })
    .then((company) => {
      const bankHolidayToRemove = company.bank_holidays.find(
        (bh) => String(bh.id) === String(bankHolidayId)
      );

      // Check if user specify valid department number
      if (!bankHolidayToRemove) {
        console.error(
          `User ${req.user.id} tried to remove non-existing bank holiday number ${bankHolidayId}`
        );
        req.session.flash_error("Cannot remove bank holiday: wrong parameters");

        return res.redirect_with_session(
          `/settings/bankholidays/?year=${currentYear}`
        );
      }

      return bankHolidayToRemove.destroy();
    })
    .then(() => {
      req.session.flash_message("Bank holiday was successfully removed");
      return res.redirect_with_session(
        `/settings/bankholidays/?year=${currentYear}`
      );
    });
});

const getAndValidateBankHoliday = ({ req, id, itemName }) => {
  // Get user parameters
  let name = validator.trim(req.body[`name__${id}`]),
    date = validator.trim(req.body[`date__${id}`]);

  // Nothing to validate, abort
  if (!name && !date) {
    return {};
  }

  // Validate provided parameters
  //
  // Note, we allow users to put whatever they want into the name.
  // The XSS defence is in the templates

  date = req.user.company.normalise_date(date);

  if (!validator.isDate(date)) {
    req.session.flash_error(`New day for ${itemName} should be date`);
  }

  return { name, date };
};

module.exports = router;

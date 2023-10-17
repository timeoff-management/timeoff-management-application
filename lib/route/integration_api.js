"use strict";

const express = require("express"),
  router = express.Router(),
  validator = require("validator"),
  Promise = require("bluebird"),
  moment = require("moment"),
  TeamView = require("../model/team_view"),
  _ = require("underscore"),
  { getAudit } = require("../model/audit"),
  { getUsersWithLeaves } = require("../model/Report");

module.exports = passport => {
  router.all(
    /.*/,
    passport.authenticate("bearer", { session: false }),
    (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }

      return res.status(401).json({ ok: false });
    }
  );

  router.get("/", (_req, res) => res.json({ ok: true }));

  router.get("/report/allowance", (req, res) => {
    const startDate = validator.isDate(req.query["start_date"])
      ? moment.utc(req.query["start_date"])
      : req.user.company.get_today();

    const endDate = validator.isDate(req.query["end_date"])
      ? moment.utc(req.query["end_date"])
      : req.user.company.get_today();

    const teamView = new TeamView({
      user: req.user,
      start_date: startDate,
      end_date: endDate
    });

    const currentDeparmentId = validator.isNumeric(req.query["department"])
      ? req.query["department"]
      : null;

    Promise.join(
      teamView.promise_team_view_details({
        department_id: currentDeparmentId
      }),
      req.user.get_company_with_all_leave_types(),
      (teamViewDetails, company) => {
        return teamView
          .inject_statistics({
            team_view_details: teamViewDetails,
            leave_types: company.leave_types
          })
          .then(teamViewDetails =>
            res.json({
              data: [
                teamViewDetails.users_and_leaves.map(ul => ({
                  userId: ul.user.id,
                  userEmail: ul.user.email,
                  userLastname: ul.user.lastname,
                  userName: ul.user.name,
                  leaveTypeBreakDown:
                    ul.statistics.leave_type_break_down.pretty_version,
                  deductedDays: ul.statistics.deducted_days
                }))
              ]
            })
          );
      }
    ).catch(error => {
      console.log(
        "An error occured when user " +
          req.user.id +
          " tried to access /reports/allowancebytime page: " +
          error
      );

      res.json({ error });
    });
  });

  router.get("/report/absence", (req, res) => {
    const startDate = validator.isDate(req.query["start_date"])
      ? moment.utc(req.query["start_date"])
      : req.user.company.get_today();

    const endDate = validator.isDate(req.query["end_date"])
      ? moment.utc(req.query["end_date"])
      : req.user.company.get_today();

    const departmentId = validator.isNumeric(req.query["department"])
      ? req.query["department"]
      : null;

    let result = getUsersWithLeaves({
      company: req.user.company,
      startDate,
      endDate,
      departmentId
    });

    result = result
      .then(data => res.json(data))
      .catch(error => {
        console.log(
          `An error occured when trying to access /report/absence: ${error} at ${
            error.stack
          }`
        );
        res.json({ error: `${error}` });
      });
  });

  router.get("/audit/", (req, res) => {
    getAudit({ companyId: req.user.companyId })
      .then(data => res.json(data))
      .catch(error => {
        console.log(`Failed to fetch Audit data: ${error} at ${error.stack}`);
        res.json({ error: `${error}` });
      });
  });

  return router;
};

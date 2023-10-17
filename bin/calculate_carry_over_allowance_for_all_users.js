"use strict";

const {
    calculateCarryOverAllowance
  } = require("../lib/model/calculateCarryOverAllowance"),
  models = require("../lib/model/db");

models.User.findAll()
  .then(users => calculateCarryOverAllowance({ users }))
  .then(() => console.log("Done!"))
  .catch(error =>
    console.log(
      `Failed to recalculate carry over allowance: ${error} at ${error.stack}`
    )
  );

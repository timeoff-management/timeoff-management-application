"use strict";

const Bluebird = require("bluebird"),
  Models = require("./db");

const getAuditCaptureForUser = ({ byUser, forUser, newAttributes }) => () => {
  const attributeUpdates = Object.keys(newAttributes)
    .filter(k => String(newAttributes[k]) !== String(forUser[k]))
    .map(attribute => {
      const insert = {
        company: byUser.company_id,
        byUser: byUser.id,
        entity_type: "USER",
        entity_id: forUser.id,
        attribute,
        old_value: String(forUser[attribute]),
        new_value: String(newAttributes[attribute])
      };

      Models.Audit.create(insert);
    });

  return Bluebird.map(attributeUpdates, f => f, { concurrency: 5 });
};

const getAudit = ({ company_id }) => {
  return Models.Audit.findAll({
    where: {
      company_id
    },
    raw: true
  });
};

module.exports = {
  getAuditCaptureForUser,
  getAudit
};

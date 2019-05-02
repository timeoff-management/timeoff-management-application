"use strict";

const Bluebird = require("bluebird"),
  Models = require("./db");

const getAuditCaptureForUser = ({ byUser, forUser, newAttributes }) => () => {
  const attributeUpdates = Object.keys(newAttributes)
    .filter(k => String(newAttributes[k]) !== String(forUser[k]))
    .map(attribute => {
      const insert = {
        company: byUser.companyId,
        byUser: byUser.id,
        entityType: "USER",
        entityId: forUser.id,
        attribute,
        old_value: String(forUser[attribute]),
        new_value: String(newAttributes[attribute])
      };

      console.log("INSERT", insert);
      Models.Audit.create(insert);
    });

  return Bluebird.map(attributeUpdates, f => f, { concurrency: 5 });
};

const getAudit = ({ companyId }) => {
  return Models.Audit.findAll({
    where: {
      companyId
    },
    raw: true
  });
};

module.exports = {
  getAuditCaptureForUser,
  getAudit
};

"use strict"

const Bluebird = require("bluebird"),
  Models = require("./db")

const getAuditCaptureForUser = ({ byUser, forUser, newAttributes }) => () => {
  const attributeUpdates = Object.keys(newAttributes)
    .filter(k => String(newAttributes[k]) !== String(forUser[k]))
    .map(attribute =>
      Models.Audit.create({
        companyId: byUser.companyId,
        byUserId: byUser.id,
        entityType: "USER",
        entityId: forUser.id,
        attribute,
        oldValue: String(forUser[attribute]),
        newValue: String(newAttributes[attribute])
      })
    )

  return Bluebird.map(attributeUpdates, f => f, { concurrency: 5 })
}

const getAudit = ({ companyId }) => {
  return Models.Audit.findAll({
    where: {
      companyId
    },
    raw: true
  })
}

module.exports = {
  getAuditCaptureForUser,
  getAudit
}

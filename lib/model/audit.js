'use strict'

const Bluebird = require('bluebird')
const Models = require('./db')

const getAuditCaptureForUser = ({ byUser, forUser, newAttributes }) => () => {
  const attributeUpdates = Object.keys(newAttributes)
    .filter(k => String(newAttributes[k]) !== String(forUser[k]))
    .map(attribute =>
      Models.Audit.create({
        companyId: byUser.companyId,
        byUserId: byUser.id,
        entityType: 'USER',
        entityId: forUser.id,
        attribute,
        oldValue: String(forUser[attribute]),
        newValue: String(newAttributes[attribute])
      })
    )

  return Bluebird.map(attributeUpdates, f => f, { concurrency: 5 })
}

const getAudit = ({ company_id }) => Models.Audit.findAll({
  where: {
    company_id
  },
  raw: true
})

module.exports = {
  getAuditCaptureForUser,
  getAudit
}

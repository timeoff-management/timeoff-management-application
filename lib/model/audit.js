'use strict'

const Bluebird = require('bluebird')
const Models = require('./db')

const getAuditCaptureForUser = ({ byUser, forUser, newAttributes }) => () => {
  const attributeUpdates = Object.keys(newAttributes)
    .filter(k => String(newAttributes[k]) !== String(forUser[k]))
    .map(attribute =>
      Models.Audit.create({
        company_id: byUser.company_id,
        by_user_id: byUser.id,
        entity_type: 'USER',
        entity_id: forUser.id,
        attribute,
        old_value: String(forUser[attribute]),
        new_value: String(newAttributes[attribute])
      })
    )

  return Bluebird.map(attributeUpdates, f => f, { concurrency: 5 })
}

const getAudit = ({ company_id }) =>
  Models.Audit.findAll({
    where: {
      company_id
    },
    raw: true
  })

module.exports = {
  getAuditCaptureForUser,
  getAudit
}

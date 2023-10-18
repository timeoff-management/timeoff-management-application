'use strict'

const Bluebird = require('bluebird')
const Models = require('./db')

const commentLeave = ({ leave, comment, company_id }) => Models.Comment.create({
  entity_type: Models.Comment.getEntityTypeLeave(),
  entity_id: leave.id,
  comment,
  company_id,
  by_user_id: leave.userId
})

const getCommentsForLeave = ({ leave }) => Models.Comment.findAll({
  raw: true,
  where: {
    entity_type: Models.Comment.getEntityTypeLeave(),
    entity_id: leave.id
  }
})

module.exports = {
  commentLeave,
  getCommentsForLeave
}

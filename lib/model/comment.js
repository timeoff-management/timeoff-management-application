"use strict";

const Bluebird = require("bluebird"),
  Models = require("./db");

const commentLeave = ({ leave, comment, company_id }) => {
  return Models.Comment.create({
    entity_type: Models.Comment.getEntityTypeLeave(),
    entity_id: leave.id,
    comment,
    company_id,
    by_user_id: leave.userId
  });
};

const getCommentsForLeave = ({ leave }) => {
  return Models.Comment.findAll({
    raw: true,
    where: {
      entity_type: Models.Comment.getEntityTypeLeave(),
      entity_id: leave.id
    }
  });
};

module.exports = {
  commentLeave,
  getCommentsForLeave
};

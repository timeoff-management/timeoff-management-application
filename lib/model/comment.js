
'use strict';

const
  Bluebird = require('bluebird'),
  Models = require('./db');

const commentLeave = ({leave, comment, companyId}) => {
  return Models.Comment.create({
    entityType: Models.Comment.getEntityTypeLeave(),
    entityId: leave.id,
    comment,
    companyId,
    byUser: leave.userId,
  });
};

module.exports = {
  commentLeave,
};

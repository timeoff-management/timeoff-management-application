"use strict"

const Promise = require("bluebird"),
  moment = require("moment")

const getUsersWithLeaves = ({
  company,
  startDate = company.get_today(),
  endDate = company.get_today(),
  departmentId = null
}) => {
  let result = company.sequelize.models.Company.scope(
    "with_active_users"
  ).findOne({
    where: { id: company.id }
  })

  result = result.then(company => Promise.resolve(company.users))

  if (departmentId) {
    result = result.then(users =>
      Promise.resolve(
        users.filter(u => String(u.DepartmentId) === String(departmentId))
      )
    )
  }

  result = result.then(users =>
    Promise.map(users, user => user.reload_with_leave_details({}), {
      concurrency: 10
    })
  )

  const filter = filterLeaves({ startDate, endDate })

  result = result.then(users =>
    Promise.map(
      users,
      user =>
        user
          .promise_my_active_leaves_ever()
          .then(leaves => Promise.resolve(leaves.filter(filter)))
          .then(leaves => Promise.resolve({ user, leaves })),
      { concurrency: 10 }
    )
  )

  result = result.then(report =>
    report.map(({ user, leaves }) => ({
      user: {
        id: user.id,
        department: user.department.name,
        email: user.email,
        fullName: user.full_name()
      },
      leaves: leaves.map(l => leaveIntoObject(l))
    }))
  )

  return result
}

const filterLeaves = ({ startDate, endDate }) => leave => {
  const sd = moment.utc(leave.get_start_leave_day().date)
  const ed = moment.utc(leave.get_end_leave_day().date)
  return (
    (sd.isSameOrAfter(startDate, "day") && sd.isSameOrBefore(endDate, "day")) ||
    (ed.isSameOrAfter(startDate, "day") && ed.isSameOrBefore(endDate, "day"))
  )
}

const leaveIntoObject = leave => {
  const dateFormat = "YYYY-MM-DD"

  const Leave = leave.sequelize.models.Leave

  const statusMap = {
    [Leave.status_new()]: "New",
    [Leave.status_approved()]: "Approved",
    [Leave.status_rejected()]: "Rejected",
    [Leave.status_pended_revoke()]: "Pended Revoke",
    [Leave.status_canceled()]: "Canceled"
  }

  return {
    startDate: moment.utc(leave.get_start_leave_day().date).format(dateFormat),
    endDate: moment.utc(leave.get_end_leave_day().date).format(dateFormat),
    dayPartStart: leave.day_part_start,
    dayPartEnd: leave.day_part_end,
    type: leave.leave_type ? leave.leave_type.name : "N/A",
    deductedDays: leave.leave_type ? leave.get_deducted_days_number() : "N/A",
    approver: leave.approver ? leave.approver.full_name() : "N/A",
    approverId: leave.approverId,
    status: statusMap[leave.status] || "Unknown",

    id: leave.id,
    employeeId: leave.userId,
    employeeFullName: leave.user ? leave.user.full_name() : "N/A",
    employeeLastName: leave.user ? leave.user.lastname : "N/A",
    departmentId: leave.user ? leave.user.departmentId : null,
    departmentName:
      leave.user && leave.user.department ? leave.user.department.name : "N/A",
    typeId: leave.leaveTypeId,
    createdAt: moment.utc(leave.createdAt).format(dateFormat)
  }
}

const fetchLeavesForLeavesReport = async ({
  startDate,
  endDate,
  departmentId,
  leaveTypeId,
  actingUser,
  dbModel
}) => {
  let users = await dbModel.User.findAll({
    where: { companyId: actingUser.companyId }
  })

  // If department was provided in filter out everyone who is not part of it
  if (departmentId) {
    users = users.filter(u => `${u.DepartmentId}` === `${departmentId}`)
  }

  // The way how we fetch the leaves is not most efficient way (mildly speaking)
  // but we go in its favour because we reuse the existing code that does similar
  // logic. Hopefully that would make the app more stable when we come to refactor
  // underlying code.

  let leavesObjects = []

  for (let user of users) {
    await user.promise_schedule_I_obey()
    let usersLeaves = await user.getMyActiveLeavesForDateRange({
      dateStart: startDate,
      dateEnd: endDate
    })

    // Filter out redundant leave types if we are interesting in only particular one
    if (leaveTypeId) {
      usersLeaves = usersLeaves.filter(
        l => `${l.leaveTypeId}` === `${leaveTypeId}`
      )
    }

    leavesObjects.push(...usersLeaves)
  }

  // Get comments that were added to leaves, so we can enrich leave data later.
  // The idea is to get all LEAVE comments into memory as a map and then use it
  // to inject comment into each leave while cycling through them
  const allComments = await dbModel.Comment.findAll({
    where: {
      companyId: actingUser.companyId,
      entityType: dbModel.Comment.getEntityTypeLeave()
    }
  })

  const commentsMap = allComments.reduce((m, c) => {
    if (m[c.entityId] === undefined) {
      m[c.entityId] = [c]
    } else {
      m[c.entityId].push(c)
    }

    return m
  }, {})

  let leaves = leavesObjects.map(l => leaveIntoObject(l))

  leaves = leaves.map(l => ({
    ...l,
    comment: commentsMap[l.id]
      ? commentsMap[l.id].map(({ comment }) => comment).join(". ")
      : ""
  }))

  return { leaves }
}

module.exports = {
  getUsersWithLeaves,
  fetchLeavesForLeavesReport,
  leaveIntoObject
}

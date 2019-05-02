"use strict";

const Promise = require("bluebird"),
  moment = require("moment");

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
  });

  result = result.then(company => Promise.resolve(company.users));

  if (departmentId) {
    result = result.then(users =>
      Promise.resolve(
        users.filter(u => String(u.DepartmentId) === String(departmentId))
      )
    );
  }

  result = result.then(users =>
    Promise.map(users, user => user.reload_with_leave_details({}), {
      concurrency: 10
    })
  );

  const filter = filterLeaves({ startDate, endDate });

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
  );

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
  );

  return result;
};

const filterLeaves = ({ startDate, endDate }) => leave => {
  const sd = moment.utc(leave.get_start_leave_day().date);
  const ed = moment.utc(leave.get_end_leave_day().date);
  return (
    (sd.isSameOrAfter(startDate, "day") && sd.isSameOrBefore(endDate, "day")) ||
    (ed.isSameOrAfter(startDate, "day") && ed.isSameOrBefore(endDate, "day"))
  );
};

const leaveIntoObject = leave => {
  const dateFormat = "YYYY-MM-DD";

  const Leave = leave.sequelize.models.Leave;

  const statusMap = {
    [Leave.status_new()]: "New",
    [Leave.status_approved()]: "Approved",
    [Leave.status_rejected()]: "Rejected",
    [Leave.status_pended_revoke()]: "Pended Revoke",
    [Leave.status_canceled()]: "Canceled"
  };

  return {
    startDate: moment.utc(leave.get_start_leave_day().date).format(dateFormat),
    endDate: moment.utc(leave.get_end_leave_day().date).format(dateFormat),
    type: leave.leave_type.name,
    deductedDays: leave.get_deducted_days_number(),
    approver: leave.approver ? leave.approver.full_name() : "N/A",
    status: statusMap[leave.status] || "Unknown"
  };
};

module.exports = {
  getUsersWithLeaves
};

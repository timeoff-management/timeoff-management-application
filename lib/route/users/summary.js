'use strict'

const express = require('express')
const router = express.Router()
const Exception = require('../../error')
const Promise = require('bluebird')

router.get('/summary/:userId/', (req, res) => {
  const requestor = req.user
  const userId = req.params.userId

  // Get user object by provided ID
  let flow = req.app
    .get('db_model')
    .User.scope('withDepartments')
    .find({ where: { id: userId } })

  // Ensure that requestor and user belong to the same company
  flow = flow.then(user => {
    if (!user || user.company_id !== requestor.company_id) {
      throw Exception.throwUserError({
        user_error: 'No access to given user',
        system_error: `User ${
          requestor.id
        } tried to access details of user ${userId}: either ID does not belong to existing user of requestor and Id does not share company`
      })
    }

    return Promise.resolve(user)
  })

  // If requestor is admin OR is manager for given user show detailed INFO
  flow = flow.then(user => {
    // In case admin is asking user's details: show detailed version
    if (requestor.is_admin()) {
      return Promise.resolve({ user, isDetailed: true })
    }

    // Check if given user is among supervised ones
    return requestor.promise_supervised_users().then(users => {
      let isDetailed = false

      if (users.filter(u => u.id === user.id).length === 1) {
        isDetailed = true
      }

      return Promise.resolve({ user, isDetailed })
    })
  })

  flow = flow.then(({ user, isDetailed }) => {
    if (!isDetailed) {
      return Promise.resolve({ user })
    }

    return Promise.all([
      user.promise_allowance(),
      user.promise_supervisors()
    ]).then(([userAllowance, supervisors]) => ({
      user,
      userAllowance,
      supervisors
    }))
  })

  flow = flow.then(({ user, userAllowance, supervisors }) => {
    const supervisorNames = (supervisors || []).map(u => u.full_name())

    res.render('user/popup_user_details', {
      layout: false,
      userFullName: user.full_name(),
      departmentName: user.get('department').name,
      userAllowance,
      supervisorNames
    })
  })

  flow.catch(error => {
    console.log(error)
    res.send('Failed to get user details...')
  })
})

module.exports = router

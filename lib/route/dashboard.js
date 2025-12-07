/*
 *
 * */

'use strict'

const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  const user = req.user

  req.session.keep_old()

  // if no user available in session show main public
  if (!user) {
    return res.redirect_with_session('./login/')
  }

  return res.redirect_with_session('./calendar/')
})

// Make sure that all fallowing handlers Dashboard
// require authenticated users
router.all(/.*/, (req, res, next) => {
  if (!req.user) {
    return res.redirect_with_session(303, '/')
  }

  next()
})

router.get('/foo/', (_req, res) => {
  res.render('dashboard', { title: 'FOO' })
})

module.exports = router

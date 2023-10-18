'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const env = process.env.NODE_ENV || 'development'
const config = require(__dirname + '/../../../config/db.json')[env]
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
)
const db = {}

fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== 'index.js')
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file))
    db[model.name] = model
  })

// Link models according associations
//
Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db)
  }
})

// Add scopes
//
Object.keys(db).forEach((modelName) => {
  if ('loadScope' in db[modelName]) {
    db[modelName].loadScope(db)
  }
})

// Link models based on associations that are based on scopes
//
Object.keys(db).forEach((modelName) => {
  if ('scopeAssociate' in db[modelName]) {
    db[modelName].scopeAssociate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db

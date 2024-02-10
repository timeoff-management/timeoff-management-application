'use strict'

const models = require('../lib/model/db')

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface
      .describeTable('Departments')
      .then(function(attributes) {
        if (attributes.hasOwnProperty('allowance')) {
          return 1
        }

        if (queryInterface.sequelize.getDialect() === 'sqlite') {
          console.log('Going into SQLIite case')

          return (
            queryInterface
              // Create Temp Departments based on current model definitiom
              .createTable('Departments_backup', models.Department.attributes)

              .then(function() {
                return queryInterface.sequelize.query(
                  'PRAGMA foreign_keys=off;'
                )
              })

              // Copy data form original Departments into new Temp one
              .then(function() {
                return queryInterface.sequelize.query(
                  'INSERT INTO `Departments_backup` (id, name, include_public_holidays, createdAt, updatedAt, company_id, bossId, allowance) SELECT id, name, include_public_holidays, createdAt, updatedAt, company_id, bossId, allowence FROM `' +
                    models.Department.tableName +
                    '`'
                )
              })

              .then(function() {
                return queryInterface.dropTable(models.Department.tableName)
              })

              .then(function() {
                return queryInterface.renameTable(
                  'Departments_backup',
                  models.Department.tableName
                )
              })

              .then(function() {
                return queryInterface.sequelize.query('PRAGMA foreign_keys=on;')
              })

              .then(function() {
                queryInterface.addIndex(models.Department.tableName, [
                  'company_id'
                ])
              })

              .then(function() {
                queryInterface.addIndex(models.Department.tableName, ['id'])
              })
          )
        } else {
          console.log('Generic option')

          return queryInterface
            .renameColumn('Departments', 'allowence', 'allowance')
            .then(function(d) {
              console.dir(d)
            })
        }
      })
  },

  down: function(queryInterface, Sequelize) {
    return queryInterface.renameColumn('Departments', 'allowance', 'allowence')
  }
}

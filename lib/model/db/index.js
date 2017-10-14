"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
// __dirname is alwasys this folder root/lib/model/db
// while . can be another directory name
// Hence, __dirname is better than .
// reference: https://stackoverflow.com/questions/8131344/what-is-the-difference-between-dirname-and-in-node-js
var config    = require(__dirname + '/../../../config/db.json')[env];
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db        = {};

fs
    .readdirSync(__dirname)
    .filter(function(file) {
        // no reading .file i.e. NO system files
        return (file.indexOf(".") !== 0)
            // don't read this file (index.js) again
            && (file !== "index.js");
    })
    .forEach(function(file) {
        var model = sequelize["import"](path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

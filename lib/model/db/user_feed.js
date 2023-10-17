'use strict'

var uuid = require('node-uuid')

module.exports = function(sequelize, DataTypes) {
  var UserFeed = sequelize.define('UserFeed', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    feed_token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      // NOTE: 'wallchart' and 'teamview' are essentially the same thing
      // later one used to be know as former, from now on use 'teamview'
      // and keep old what for data compatibility
      type: DataTypes.ENUM('calendar', 'wallchart', 'teamview', 'company'),
      allowNull: false
    }
  })

  UserFeed.associate = function(models) {
    UserFeed.belongsTo(models.User, { as: 'user' })
  }

  UserFeed.promise_new_feed = function(args) {
    var self = this,
      user = args.user,
      type = args.type

    return self
      .findOne({ where: { userId: user.id, type: type } })
      .then(function(feed) {
        if (feed) {
          feed.feed_token = uuid.v4()
          return feed.save()
        } else {
          return self.create({
            name: 'Calendar Feed',
            feed_token: uuid.v4(),
            type: type,
            userId: user.id
          })
        }
      })
  }

  UserFeed.prototype.is_calendar = function() {
    return this.type === 'calendar'
  }

  UserFeed.prototype.is_team_view = function() {
    return this.type === 'wallchart' || this.type === 'teamview'
  }

  return UserFeed
}

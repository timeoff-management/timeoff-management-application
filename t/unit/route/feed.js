'use strict';

const expect = require('chai').expect;
const moment = require('moment');
const Promise = require('bluebird');
const TeamView = require('../../../lib/model/team_view');

describe('calendar feed event names', function() {
  let handler, originalComments, originalTeamView;
  const commentPath = require.resolve('../../../lib/model/comment');
  const feedPath = require.resolve('../../../lib/route/feed');

  before(function() {
    originalComments = require.cache[commentPath];
    require.cache[commentPath] = {id: commentPath, filename: commentPath, loaded: true,
      exports: {getCommentsForLeave: () => Promise.resolve([])}};
    delete require.cache[feedPath];
    const feedRouter = require(feedPath);
    originalTeamView = TeamView.prototype.promise_team_view_details;
    TeamView.prototype.promise_team_view_details = () => Promise.resolve({users_and_leaves: [{user, days: [day]}]});
    const model = {
      Company: {get_mode_readonly_holidays: () => 'readonly'},
      User: {},
      UserFeed: {find: ({where}) => Promise.resolve({
        user,
        is_calendar: () => where.feed_token === 'personal',
      })},
    };
    handler = feedRouter.stack[0].route.stack[0].handle;
    this.feedModel = model;
  });

  after(function() {
    TeamView.prototype.promise_team_view_details = originalTeamView;
    delete require.cache[feedPath];
    if (originalComments) require.cache[commentPath] = originalComments;
    else delete require.cache[commentPath];
  });

  const day = {
    moment: moment.utc('2026-11-19'),
    is_leave_morning: true,
    is_leave_afternoon: true,
    leaveLabel: 'Annual Leave',
    leave_obj: {id: 1},
  };
  const user = {
    full_name: () => 'Daniel Zehe',
    company: {get_today: () => moment.utc('2026-11-01')},
    promise_calendar: () => Promise.resolve([{as_for_team_view: () => [day]}]),
  };

  function fetchFeed(token, model) {
    return new global.Promise(resolve => {
      handler({params: {token}, app: {get: () => model}}, {send: resolve});
    });
  }

  it('includes the leave type in personal and team calendar feeds', async function() {
    for (const token of ['personal', 'team']) {
      const body = await fetchFeed(token, this.feedModel);
      expect(body).to.contain('SUMMARY:Daniel Zehe — Annual Leave');
    }
  });

  it('shows both leave types when morning and afternoon differ', async function() {
    day.leaveLabel = 'Annual Leave (morning) Sick Leave (afternoon)';
    try {
      const body = await fetchFeed('personal', this.feedModel);
      expect(body.replace(/\r\n[ \t]/g, '')).to.contain('SUMMARY:Daniel Zehe — Annual Leave (morning) Sick Leave (afternoon)');
    } finally {
      day.leaveLabel = 'Annual Leave';
    }
  });
});

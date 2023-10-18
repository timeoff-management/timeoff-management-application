'use strict'

const bluebird = require('bluebird')
const handlebars = require('express-handlebars').create({
  partialsDir: __dirname + '/../views/partials/',
  extname: '.hbs',
  helpers: require('./view/helpers')()
})
const config = require('./config')
const { WebClient } = require('@slack/client')

function Slack() {}

// This is a little helper that ensure that data in context are in a shape
// suitable for usage in templates
//
function _promise_to_unfold_context(context) {
  if (context.hasOwnProperty('user')) {
    return context.user.reload_with_session_details()
  } else {
    return bluebird.resolve(1)
  }
}

Slack.prototype.promise_rendered_slack_template = function(args) {
  const filename = args.template_name
  const context = args.context || {}

  return (
    bluebird
      .resolve()

      // Prepare context to be passed into first rendering stage
      .then(() => _promise_to_unfold_context(context))

      // Render slack text
      .then(() => handlebars.render(
        __dirname + '/../views/slack/' + filename + '.hbs',
        context
      ))

      .then((text) => bluebird.resolve({
        slack_username: context.slack_username,
        text
      }))
  )
}

// If current configuration does not allow sending slacks, it return empty function
//
Slack.prototype.get_send_slack = function() {
  // Check if current installation is set to send slack notifications
  if (!config.get('send_slacks')) {
    return function() {
      console.log('Pretend to send slack: ' + JSON.stringify(arguments))
      return bluebird.resolve()
    }
  }

  const slack_settings = config.get('slack_settings')

  const web = new WebClient(slack_settings.token)

  const push_slack = function(args) {
    console.log('Sending slack message')
    console.log(args.channel)
    if (args.channel) {
      web.chat
        .postMessage({
          username: slack_settings.bot_name,
          channel: args.channel,
          icon_url: slack_settings.icon_url,
          attachments: [
            {
              text: args.text
            }
          ]
        })
        .then(res => {
          // `res` contains information about the posted message
          console.log('Message sent: ', res.ts)
        })
        .catch(console.error)
    } else {
      console.log('Missing slack_username ' + JSON.stringify(arguments))
      return bluebird.resolve()
    }
  }

  const send_slack = bluebird.promisify(push_slack)

  return send_slack
}

// Send registration complete slack for provided user

Slack.prototype.promise_registration_slack = function(args) {
  const self = this
  const user = args.user
  const send_slack = self.get_send_slack()

  return self
    .promise_rendered_slack_template({
      template_name: 'registration_complete_slack',
      context: {
        user,
        slack_username: user.slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))
}

Slack.prototype.promise_add_new_user_slack = function(args) {
  const self = this
  const company = args.company
  const admin_user = args.admin_user
  const new_user = args.new_user
  const slack_username = args.new_user.slack_username
  const send_slack = self.get_send_slack()

  return self
    .promise_rendered_slack_template({
      template_name: 'add_new_user_slack',
      context: {
        new_user,
        admin_user,
        company,
        user: new_user,
        slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))
}

Slack.prototype.promise_leave_request_revoke_slacks = function(args) {
  const self = this
  const leave = args.leave
  const send_slack = self.get_send_slack()

  let template_name_to_supervisor = 'leave_request_revoke_to_supervisor_slack'
  let template_name_to_requestor = 'leave_request_revoke_to_requestor_slack'

  if (leave.get('user').is_auto_approve()) {
    template_name_to_supervisor =
      'leave_request_revoke_to_supervisor_autoapprove_slack'
    template_name_to_requestor =
      'leave_request_revoke_to_requestor_autoapprove_slack'
  }

  const promise_slack_to_supervisor = self
    .promise_rendered_slack_template({
      template_name: template_name_to_supervisor,
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        user: leave.get('approver'),
        slack_username: leave.get('approver').slack_username
      }
    })
    .then((slack_obj) => {
      console.log('Approver')
      console.log(slack_obj)
      return send_slack({
        channel: slack_obj.slack_username,
        text: slack_obj.text
      }).then((send_result) => bluebird.resolve(send_result))
    })

  const promise_slack_to_requestor = self
    .promise_rendered_slack_template({
      template_name: template_name_to_requestor,
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        user: leave.get('user'),
        slack_username: leave.get('user').slack_username
      }
    })
    .then((slack_obj) => {
      console.log('Requester')
      console.log(slack_obj)

      return send_slack({
        channel: slack_obj.slack_username,
        text
      }).then((send_result) => bluebird.resolve(send_result))
    })

  return bluebird.join(
    promise_slack_to_supervisor,
    promise_slack_to_requestor,
    () => bluebird.resolve()
  )
}

Slack.prototype.promise_leave_request_slacks = function(args) {
  const self = this
  const leave = args.leave
  const send_slack = self.get_send_slack()

  let template_name_to_supervisor = 'leave_request_to_supervisor_slack'
  let template_name_to_requestor = 'leave_request_to_requestor_slack'

  if (leave.get('user').is_auto_approve()) {
    template_name_to_supervisor =
      'leave_request_to_supervisor_autoapprove_slack'
    template_name_to_requestor = 'leave_request_to_requestor_autoapprove_slack'
  }

  const promise_slack_to_supervisor = supervisor =>
    self
      .promise_rendered_slack_template({
        template_name: template_name_to_supervisor,
        context: {
          leave,
          approver: supervisor,
          requester: leave.get('user'),
          user: supervisor,
          slack_username: supervisor.slack_username
        }
      })
      .then(slack_obj =>
        send_slack({
          channel: slack_obj.slack_username,
          text: slack_obj.text
        }).then(send_result => bluebird.resolve(send_result))
      )

  const promise_slack_to_requestor = self
    .promise_rendered_slack_template({
      template_name: template_name_to_requestor,
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        user: leave.get('approver'),
        slack_username: leave.get('user').slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))

  return bluebird.join(
    promise_slack_to_requestor,
    leave
      .get('user')
      .promise_supervisors()
      .map(supervisor => promise_slack_to_supervisor(supervisor)),
    () => bluebird.resolve()
  )
}

Slack.prototype.promise_leave_request_decision_slacks = function(args) {
  const self = this
  const leave = args.leave
  const action = args.action
  const was_pended_revoke = args.was_pended_revoke
  const send_slack = self.get_send_slack()

  const promise_slack_to_supervisor = self
    .promise_rendered_slack_template({
      template_name: 'leave_request_decision_to_supervisor_slack',
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        action,
        was_pended_revoke,
        user: leave.get('approver'),
        slack_username: leave.get('approver').slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))

  const promise_slack_to_requestor = self
    .promise_rendered_slack_template({
      template_name: 'leave_request_decision_to_requestor_slack',
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        action,
        was_pended_revoke,
        user: leave.get('user'),
        slack_username: leave.get('user').slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))

  return bluebird.join(
    promise_slack_to_supervisor,
    promise_slack_to_requestor,
    () => bluebird.resolve()
  )
}

Slack.prototype.promise_forgot_password_slack = function(args) {
  const self = this
  const user = args.user
  const send_slack = self.get_send_slack()

  console.log('promise_forgot_password_slack')
  console.log(args)

  return user
    .getCompany()
    .then((company) => self.promise_rendered_slack_template({
      template_name: 'forgot_password_slack',
      context: {
        user,
        company,
        slack_username: user.slack_username
      }
    }))
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))
}

Slack.prototype.promise_reset_password_slack = function(args) {
  const self = this
  const user = args.user
  const send_slack = self.get_send_slack()

  return self
    .promise_rendered_slack_template({
      template_name: 'reset_password_slack',
      context: {
        user,
        slack_username: user.slack_username
      }
    })
    .then((slack_obj) => send_slack({
      channel: slack_obj.slack_username,
      text: slack_obj.text
    }).then((send_result) => bluebird.resolve(send_result)))
}

Slack.prototype.promise_leave_request_cancel_slacks = function(args) {
  const self = this
  const leave = args.leave
  const send_slack = self.get_send_slack()

  const promise_slack_to_supervisor = self
    .promise_rendered_slack_template({
      template_name: 'leave_request_cancel_to_supervisor_slack',
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        user: leave.get('approver'),
        slack_username: leave.get('approver').slack_username
      }
    })
    .then((slack_obj) => {
      console.log('APPROVER')
      console.log(slack_obj)
      return send_slack({
        channel: slack_obj.slack_username,
        text: slack_obj.text
      }).then((send_result) => bluebird.resolve(send_result))
    })

  const promise_slack_to_requestor = self
    .promise_rendered_slack_template({
      template_name: 'leave_request_cancel_to_requestor_slack',
      context: {
        leave,
        approver: leave.get('approver'),
        requester: leave.get('user'),
        user: leave.get('user'),
        slack_username: leave.get('user').slack_username
      }
    })

    .then((slack_obj) => {
      console.log('APPROVER')
      console.log(slack_obj)
      return send_slack({
        channel: slack_obj.slack_username,
        text: slack_obj.text
      }).then((send_result) => bluebird.resolve(send_result))
    })

  return bluebird.join(
    promise_slack_to_supervisor,
    promise_slack_to_requestor,
    () => bluebird.resolve()
  )
}

module.exports = Slack

'use strict'

const bluebird = require('bluebird')
const handlebars = require('express-handlebars').create({
  partialsDir: __dirname + '/../views/partials/',
  extname: '.hbs',
  helpers: require('./view/helpers')()
})
const config = require('./config')
const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport')
const model = require('./model/db')
const { getCommentsForLeave } = require('./model/comment')

function Email() {}

const transporter = nodemailer.createTransport(
  smtpTransport(config.get('email_transporter'))
)

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

// Resolves with ready to use email and its subject.
// There is two staged rendering process (due to limitation
// of hadlebar layout mechanism):
//  * render inner part of template
//  * place the innerpart ingo ready to use HTML wrapper

Email.prototype.promise_rendered_email_template = function(args) {
  const filename = args.template_name
  const context = args.context || {}

  return (
    bluebird
      .resolve()

      // Prepare context to be passed into first rendering stage
      .then(() => _promise_to_unfold_context(context))

      // Render inner part of email
      .then(() =>
        handlebars.render(
          __dirname + '/../views/email/' + filename + '.hbs',
          context
        )
      )

      // Produce final (ready to use) version of email and Subject
      .then(text => {
        // Extract subject from email
        const subject_and_body = text.split(/\r?\n=====\r?\n/)

        return (
          handlebars
            // Render ready to use email: wrap the content with fancy HTML boilerplate
            .render(__dirname + '/../views/email/wrapper.hbs', {
              subject: subject_and_body[0],
              body: subject_and_body[1]
            })
            .then(final_email =>
              bluebird.resolve({
                subject: subject_and_body[0],
                body: final_email
              })
            )
        )
      })
  )
}

// Return function that support same interface as sendMail but promisified.
// If current configuration does not allow sending emails, it return empty function
//
Email.prototype.get_send_email = function() {
  // Check if current installation is set to send emails
  if (!config.get('send_emails') || !config.get('email_transporter')) {
    return function() {
      console.log('Pretend to send email: ' + JSON.stringify(arguments))
      return bluebird.resolve()
    }
  }

  // we do not wait for mails..just send them in background

  return function(data) {
    // return new Promise(function (resolve, reject) {
    transporter.sendMail(data, (err, info) => {
      if (err) {
        console.error('error sending mail', err)
        return reject(err)
      }
      // resolve(info);
    })

    return Promise.resolve()
    // });
  }

  // return send_mail;
}

// Send registration complete email for provided user
//
Email.prototype.promise_registration_email = function(args) {
  const self = this
  const user = args.user
  const send_mail = self.get_send_email()

  return self
    .promise_rendered_email_template({
      template_name: 'registration_complete',
      context: { user }
    })
    .then(email_obj =>
      send_mail({
        from: config.get('application_sender_email'),
        to: user.email,
        subject: email_obj.subject,
        html: email_obj.body
      }).then(send_result =>
        user
          .record_email_addressed_to_me(email_obj)
          .then(() => bluebird.resolve(send_result))
      )
    )
}

Email.prototype.promise_add_new_user_email = function(args) {
  const self = this
  const company = args.company
  const admin_user = args.admin_user
  const new_user = args.new_user
  const send_mail = self.get_send_email()

  return self
    .promise_rendered_email_template({
      template_name: 'add_new_user',
      context: {
        new_user,
        admin_user,
        company,
        user: new_user
      }
    })
    .then(email_obj =>
      send_mail({
        from: config.get('application_sender_email'),
        to: new_user.email,
        subject: email_obj.subject,
        html: email_obj.body
      }).then(send_result =>
        new_user
          .record_email_addressed_to_me(email_obj)
          .then(() => bluebird.resolve(send_result))
      )
    )
}

Email.prototype.promise_leave_request_revoke_emails = function(args) {
  const self = this
  const leave = args.leave
  const send_mail = self.get_send_email()

  let template_name_to_supervisor = 'leave_request_revoke_to_supervisor'
  let template_name_to_requestor = 'leave_request_revoke_to_requestor'

  if (
    model.Leave.does_skip_approval(leave.get('user'), leave.get('leave_type'))
  ) {
    template_name_to_supervisor =
      'leave_request_revoke_to_supervisor_autoapprove'
    template_name_to_requestor = 'leave_request_revoke_to_requestor_autoapprove'
  }

  const promise_email_to_supervisor = comments =>
    self
      .promise_rendered_email_template({
        template_name: template_name_to_supervisor,
        context: {
          leave,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('approver')
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('approver').email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() =>
          leave.get('approver').record_email_addressed_to_me(email_obj)
        )
      )

  const promise_email_to_requestor = comments =>
    self
      .promise_rendered_email_template({
        template_name: template_name_to_requestor,
        context: {
          leave,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('user')
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('user').email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() => leave.get('user').record_email_addressed_to_me(email_obj))
      )

  return getCommentsForLeave({ leave }).then(comments =>
    bluebird.join(
      promise_email_to_supervisor(comments),
      promise_email_to_requestor(comments),
      () => bluebird.resolve()
    )
  )
}

Email.prototype.promise_leave_request_emails = function(args) {
  const self = this
  const leave = args.leave
  const send_mail = self.get_send_email()

  let template_name_to_supervisor = 'leave_request_to_supervisor'
  let template_name_to_requestor = 'leave_request_to_requestor'

  if (
    model.Leave.does_skip_approval(leave.get('user'), leave.get('leave_type'))
  ) {
    template_name_to_supervisor = 'leave_request_to_supervisor_autoapprove'
    template_name_to_requestor = 'leave_request_to_requestor_autoapprove'
  }

  const promise_email_to_supervisor = ({
    comments,
    requesterAllowance
  }) => supervisor =>
    self
      .promise_rendered_email_template({
        template_name: template_name_to_supervisor,
        context: {
          leave,
          comments,
          approver: supervisor,
          requester: leave.get('user'),
          user: supervisor,
          requesterAllowance
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: supervisor.email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() => supervisor.record_email_addressed_to_me(email_obj))
      )

  const promise_email_to_requestor = ({ comments, requesterAllowance }) =>
    self
      .promise_rendered_email_template({
        template_name: template_name_to_requestor,
        context: {
          leave,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('approver'),
          requesterAllowance
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('user').email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() => leave.get('user').record_email_addressed_to_me(email_obj))
      )

  return Promise.all([
    getCommentsForLeave({ leave }),
    leave.get('user').promise_allowance()
  ]).then(([comments, requesterAllowance]) =>
    bluebird.join(
      promise_email_to_requestor({ comments, requesterAllowance }),
      leave
        .get('user')
        .promise_supervisors()
        .map(supervisor =>
          promise_email_to_supervisor({ comments, requesterAllowance })(
            supervisor
          )
        ),
      () => bluebird.resolve()
    )
  )
}

Email.prototype.promise_leave_request_decision_emails = function(args) {
  const self = this
  const leave = args.leave
  const action = args.action
  const was_pended_revoke = args.was_pended_revoke
  const send_mail = self.get_send_email()

  const promise_email_to_supervisor = comments =>
    self
      .promise_rendered_email_template({
        template_name: 'leave_request_decision_to_supervisor',
        context: {
          leave,
          action,
          was_pended_revoke,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('approver')
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('approver').email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() =>
          leave.get('approver').record_email_addressed_to_me(email_obj)
        )
      )

  const promise_email_to_requestor = comments =>
    self
      .promise_rendered_email_template({
        template_name: 'leave_request_decision_to_requestor',
        context: {
          leave,
          action,
          was_pended_revoke,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('user')
        }
      })
      .then(email_obj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('user').email,
          subject: email_obj.subject,
          html: email_obj.body
        }).then(() => leave.get('user').record_email_addressed_to_me(email_obj))
      )

  return getCommentsForLeave({ leave }).then(comments =>
    bluebird.join(
      promise_email_to_supervisor(comments),
      promise_email_to_requestor(comments),
      () => bluebird.resolve()
    )
  )
}

Email.prototype.promise_forgot_password_email = function(args) {
  const self = this
  const user = args.user
  const send_mail = self.get_send_email()

  return user
    .getCompany()
    .then(company =>
      self.promise_rendered_email_template({
        template_name: 'forgot_password',
        context: {
          user,
          company
        }
      })
    )
    .then(email_obj =>
      send_mail({
        from: config.get('application_sender_email'),
        to: user.email,
        subject: email_obj.subject,
        html: email_obj.body
      }).then(send_result =>
        user
          .record_email_addressed_to_me(email_obj)
          .then(() => bluebird.resolve(send_result))
      )
    )
}

Email.prototype.promise_reset_password_email = function(args) {
  const self = this
  const user = args.user
  const send_mail = self.get_send_email()

  return self
    .promise_rendered_email_template({
      template_name: 'reset_password',
      context: {
        user
      }
    })
    .then(email_obj =>
      send_mail({
        from: config.get('application_sender_email'),
        to: user.email,
        subject: email_obj.subject,
        html: email_obj.body
      }).then(send_result =>
        user
          .record_email_addressed_to_me(email_obj)
          .then(() => bluebird.resolve(send_result))
      )
    )
}

Email.prototype.promise_leave_request_cancel_emails = function(args) {
  const self = this
  const leave = args.leave
  const send_mail = self.get_send_email()

  const promise_email_to_supervisor = comments =>
    self
      .promise_rendered_email_template({
        template_name: 'leave_request_cancel_to_supervisor',
        context: {
          leave,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('approver')
        }
      })
      .then(emailObj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('approver').email,
          subject: emailObj.subject,
          html: emailObj.body
        }).then(() =>
          leave.get('approver').record_email_addressed_to_me(emailObj)
        )
      )

  const promise_email_to_requestor = comments =>
    self
      .promise_rendered_email_template({
        template_name: 'leave_request_cancel_to_requestor',
        context: {
          leave,
          comments,
          approver: leave.get('approver'),
          requester: leave.get('user'),
          user: leave.get('user')
        }
      })
      .then(emailObj =>
        send_mail({
          from: config.get('application_sender_email'),
          to: leave.get('user').email,
          subject: emailObj.subject,
          html: emailObj.body
        }).then(() => leave.get('user').record_email_addressed_to_me(emailObj))
      )

  return getCommentsForLeave({ leave }).then(comments =>
    bluebird.join(
      promise_email_to_supervisor(comments),
      promise_email_to_requestor(comments),
      () => bluebird.resolve()
    )
  )
}

module.exports = Email

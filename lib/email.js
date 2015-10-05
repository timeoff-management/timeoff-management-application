
"use strict;";

var bluebird  = require('bluebird'),
handlebars    = require('express-handlebars').create({
  partialsDir : __dirname+'/../views/partials/',
  extname     : '.hbs',
}),
config        = require('./config'),
nodemailer    = require('nodemailer'),
smtpTransport = require('nodemailer-smtp-transport');

function Email(){

};

Email.prototype.promise_rendered_email_template = function(args){
  var filename = args.template_name,
      context = args.context || {};

  return handlebars.render(
    __dirname+'/../views/email/'+filename+'.hbs',
    context
  )
  .then(function(text){
    var subject_and_body = text.split(/\n=====\n/);
    return bluebird.resolve({
      subject : subject_and_body[0],
      body    : subject_and_body[1],
    });
  });

};

// Return function that support same interface as sendMail but promisified.
// If current configuration does not allow sending emails, it return empty function
//
Email.prototype.get_send_email = function(){

  // Check if current installation is set to send emails
  if (! config.get("send_emails") || ! config.get("email_transporter") ) {
    return function(){ return bluebird.resolve(); }
  }

  var transporter = nodemailer.createTransport(smtpTransport(
    config.get("email_transporter")
  ));

  var send_mail = bluebird.promisify(transporter.sendMail, transporter);

  return send_mail;
};

// Send registration complete email for provided user
//
Email.prototype.promise_registration_email = function(args){
  var self = this,
      user = args.user;
  var send_mail = self.get_send_email();

  return self.promise_rendered_email_template({
    template_name : 'registration_complete',
    context : {user : user}
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : user.email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

};

Email.prototype.promise_add_new_user_email = function(args){
  var self   = this,
  company    = args.company,
  admin_user = args.admin_user,
  new_user   = args.new_user,
  send_mail  = self.get_send_email();

  return self.promise_rendered_email_template({
    template_name : 'add_new_user',
    context : {
      new_user   : new_user,
      admin_user : admin_user,
      company    : company,
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : new_user.email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

};

Email.prototype.promise_leave_request_emails = function(args){
  var self   = this,
  leave      = args.leave,
  send_mail  = self.get_send_email();


  var promise_email_to_supervisor = self.promise_rendered_email_template({
    template_name : 'leave_request_to_supervisor',
    context : {
      leave : leave,
      approver : leave.get('approver'),
      requester: leave.get('user'),
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('approver').email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

  var promise_email_to_requestor = self.promise_rendered_email_template({
    template_name : 'leave_request_to_requestor',
    context : {
      leave : leave,
      approver : leave.get('approver'),
      requester: leave.get('user'),
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

  return bluebird.join(
    promise_email_to_supervisor, promise_email_to_requestor,
    function(){
      return bluebird.resolve();
    }
  );
};


Email.prototype.promise_leave_request_decision_emails = function(args){
  var self   = this,
  leave      = args.leave,
  action     = args.action,
  send_mail  = self.get_send_email();

  var promise_email_to_supervisor = self.promise_rendered_email_template({
    template_name : 'leave_request_decision_to_supervisor',
    context : {
      leave     : leave,
      approver  : leave.get('approver'),
      requester : leave.get('user'),
      action    : action,
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('approver').email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

  var promise_email_to_requestor = self.promise_rendered_email_template({
    template_name : 'leave_request_decision_to_requestor',
    context : {
      leave     : leave,
      approver  : leave.get('approver'),
      requester : leave.get('user'),
      action    : action,
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

  return bluebird.join(
    promise_email_to_supervisor, promise_email_to_requestor,
    function(){
      return bluebird.resolve();
    }
  );
};


module.exports = Email;

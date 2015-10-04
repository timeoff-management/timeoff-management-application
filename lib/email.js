
"use strict;";

var bluebird  = require('bluebird'),
handlebars    = require('express-handlebars').create(),
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
      to      : 'pavel.vodopyan@gmail.com',
      subject : email_obj.subject,
      text    : email_obj.body,
    });
  });

};

module.exports = Email;

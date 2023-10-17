/*
 * This module provide middleware that cares about flash messages within session
 * object. That is messages that live between two requests. As rule used to
 * communicate status/error messages from actions to result pages.
 *
 * The messages are carried in "flash" entry of session object. This entry live
 * no more then within span of two requests. If one needs it to be longer "flash"
 * entry should be repopulated.
 *
 * Session object is injected with methods:
 *
 *  - flash_error   : saves the error message(s) into the "flash"
 *  - flash_message : saves the confirmation message(s) into the "flash".
 *  Both methods accept either string or array of strings.
 *
 *  - flash_has_errors : determine if current "flash" entry has error messages.
 *
 * "flash" entry is brought into res.locals hence could be used in templates.
 *
 * */

"use strict";

// Move flash object out of session and place it in to locals
// so template is aware of it
module.exports = function (req, res, next) {
  res.locals.flash = req.session.flash;
  delete req.session.flash;

  // This is is a function that return custom function to be installed
  // into session object as a method to add new message or array of
  // messages.
  var install_flash_array = function (key) {
    return function (error_message) {
      if (!this.flash) {
        this.flash = {};
      }
      if (!Array.isArray(this.flash[key])) {
        this.flash[key] = [];
      }

      if (Array.isArray(error_message)) {
        this.flash[key] = this.flash[key].concat(error_message);
      } else {
        this.flash[key].push(error_message);
      }
    };
  };

  req.session.flash_error = install_flash_array("errors");
  req.session.flash_message = install_flash_array("messages");

  req.session.flash_has_errors = function () {
    return (
      this.flash &&
      Array.isArray(this.flash.errors) &&
      this.flash.errors.length > 0
    );
  };

  req.session.keep_old = function () {
    if (res.locals.flash) {
      if (res.locals.flash.errors) this.flash_error(res.locals.flash.errors);
      if (res.locals.flash.messages)
        this.flash_message(res.locals.flash.messages);
    }
  };

  next();
};

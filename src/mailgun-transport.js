'use strict';

var Mailgun = require('mailgun-js');
var packageData = require('../package.json');
var pickBy = require('lodash.pickby');
var some = require('lodash.some');
var startsWith = require('lodash.startswith');

var whitelistExact = [
  'from',
  'to',
  'cc',
  'bcc',
  'subject',
  'text',
  'html',
  'attachment',
  'o:tag',
  'o:campaign',
  'o:dkim',
  'o:deliverytime',
  'o:testmode',
  'o:tracking',
  'o:tracking-clicks',
  'o:tracking-opens',
  'o:require-tls',
  'o:skip-verification'
];
var whitelistPrefix = [
  'h:',
  'v:'
];

module.exports = function (options) {
  return new MailgunTransport(options);
};

function MailgunTransport(options) {
  this.options = options || {};
  this.name = 'Mailgun';
  this.version = packageData.version;

  this.mailgun = Mailgun({
    apiKey: this.options.auth.api_key,
    domain: this.options.auth.domain || ''
  });
  this.messages = this.mailgun.messages();
}


MailgunTransport.prototype.send = function send(mail, callback) {
  var self = this;
  var mailData = mail.data;
  // convert nodemailer attachments to mailgun-js attachements
  if (mailData.attachments) {
    mailData.attachment = mailData.attachments.map(function (a) {
      return new self.mailgun.Attachment({
        data: a.path || undefined,
        filename: a.filename || undefined,
        contentType: a.contentType || undefined,
        knownLength: a.knownLength || undefined
      });
    });
  }

  var options = pickBy(mailData, function (value, key) {
    if (whitelistExact.indexOf(key) !== -1) {
      return true;
    }

    return some(whitelistPrefix, function (prefix) {
      return startsWith(key, prefix);
    });
  });

  this.messages.send(options, function (err, data) {
    callback(err || null, data);
  });
};

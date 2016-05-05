'use strict';

var Mailgun = require('mailgun-js');
var packageData = require('../package.json');
var pickBy = require('lodash.pickby');
var some = require('lodash.some');

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
}


MailgunTransport.prototype.send = function send(mail, callback) {
  var mailData = mail.data;
  // convert nodemailer attachments to mailgun-js attachements
  if(mailData.attachments){
    var a, b, aa = [];
    for(var i in mailData.attachments){
      a = mailData.attachments[i];
      b = new this.mailgun.Attachment({
        data        : a.path || undefined,
        filename    : a.filename || undefined,
        contentType : a.contentType || undefined,
        knownLength : a.knownLength || undefined
      });

      aa.push(b);
    }
    mailData.attachment = aa;
  }

  var options = pickBy(mailData, function (key) {
    if (whitelistExact.indexOf(key) !== -1) {
      return true;
    }

    return some(whitelistPrefix, function (prefix) {
      return key.startsWith(prefix);
    });
  });

  this.mailgun.messages().send(options, function (err, data) {
    callback(err || null, data);
  });

};


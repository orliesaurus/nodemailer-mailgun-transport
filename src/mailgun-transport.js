'use strict';

var Mailgun = require('mailgun-js');
var cons = require('consolidate');
var packageData = require('../package.json');
var series = require('async-series');
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
  'recipient-variables',
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
  series([
    function(done) {
      if (mailData.template && mailData.template.name && mailData.template.engine) {
        mailData.template.context = mailData.template.context || {};
        cons[mailData.template.engine](mailData.template.name, mailData.template.context, function(err, html) {
          if (err) throw err;
          mailData.html = html;
          done();
        });
      } else {
        done();
      }
    },
    function(done) {
      // convert nodemailer attachments to mailgun-js attachements
      if(mailData.attachments){
        var a, b, data, aa = [];
        mailData.attachment = [];

        for(var i in mailData.attachments){
          a = mailData.attachments[i];

          // mailgunjs does not encode content string to a buffer
          if (typeof a.content === 'string') {
            data = new Buffer(a.content, a.encoding);
          } else {
            data = a.content || a.path || undefined;
          }

          b = new self.mailgun.Attachment({
            data        : data,
            filename    : a.filename || undefined,
            contentType : a.contentType || undefined,
            knownLength : a.knownLength || undefined
          });

          mailData.attachment.push(b);
        }
      }

      var options = pickBy(mailData, function (value, key) {
        if (whitelistExact.indexOf(key) !== -1) {
          return true;
        }

        return some(whitelistPrefix, function (prefix) {
          return startsWith(key, prefix);
        });
      });

      self.messages.send(options, function (err, data) {
        callback(err || null, data);
      });
    }
  ], function(err) {
    if (err) throw err;
  });
};

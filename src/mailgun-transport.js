'use strict';

var Mailgun = require('mailgun-js');
var packageData = require('../package.json');

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
  // convert nodemailer attachments to mailgun-js attachements
  if(mail.data.attachments){
    var a, b, aa = [];
    for(var i in mail.data.attachments){
      a = mail.data.attachments[i];
      b = new this.mailgun.Attachment({
        data        : a.path || undefined,
        filename    : a.filename || undefined,
        contentType : a.contentType || undefined,
        knownLength : a.knownLength || undefined
      });

      aa.push(b);
    }
    mail.data.attachment = aa;

    // delete obscelete attachements key
    delete mail.data.attachments;
  }

  // for some reasons, this trigger and error if present...
  // @todo: understand why (or where) its happening...
  delete mail.data.headers;
  
  this.mailgun.messages().send(mail.data, callback);
};


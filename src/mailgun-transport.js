'use strict';

var Mailgun = require('mailgun-js');
var packageData = require('../package.json');

module.exports = function(options) {
  return new MailgunTransport(options);
};

function MailgunTransport(options) {
  this.options = options || {};
  this.name = 'Mailgun';
  this.version = packageData.version;
}

MailgunTransport.prototype.send = function (mail, callback) {

  var mailgun = Mailgun({
    apiKey: this.options.auth.api_key,
    domain: this.options.auth.domain || ''
  });

  var data = {   
    from: mail.data.from,
    to: mail.data.to,
    subject: mail.data.subject,
    text: mail.data.text,
    html: mail.data.html
  }

  mailgun.messages().send(data,
    function (err, body) {
      if (err) {
        console.log(err);
        return callback(err);
      }
      return callback();
    }
  );

};


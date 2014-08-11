'use strict';
var Mailgun = require('./mailgun.js').Mailgun;
var packageData = require('../package.json');



module.exports = function(options) {
  return new MailgunTransport(options);
};

function MailgunTransport(options) {
  options = options || {};

  this.options = options;
  this.name = 'Mailgun';
  this.version = packageData.version;
}

MailgunTransport.prototype.send = function(mail, callback) {
	var mg = new Mailgun(this.options.auth.api_key);
	var email = mail.data;
	
	mg.sendText(mail.data.from,
	 mail.data.to,
	 mail.data.subject,
	 mail.data.text,
	 '',
	 {},
	 function(err) {
    	if (err)
    		console.log('Error Caught: ' + err);
    	else
    		console.log('Success!');
});
};
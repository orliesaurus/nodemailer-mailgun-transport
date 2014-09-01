nodemailer-mailgun-transport
============================

#What is this?
nodemailer is an amazing node module to send emails within any of your nodejs apps.
This is the transport plugin that goes with nodemailer to send email using [Mailgun](https://mailgun.com/)'s awesomeness!
Pow Pow.


#How does it work
Based on this mailgun module and the nodemailer module, this is a transport layer, meaning it will allow you to send emails using nodemailer, but using the Mailgun API instead of an SMTP protocol!

Nodemailer allows you to write code once and then swap out the transport so you can use different accounts on different providers.

The Mailgun transport for nodemailer is great to use when SMTP is blocked on your server or you just prefer the reliability of the web api!

#Quickstart - Example

Create a new file, install the dependencies **[1]** and look at the skeleton code below to get you started quickly!



    var nodemailer = require('nodemailer');
    var mg = require('nodemailer-mailgun-transport');
    
    var auth = {
    	auth: {
    	api_key: 'key-1234123412341234' // This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
    	}
    }
    
    var nodemailerMailgun = nodemailer.createTransport(mg(auth));
    
    nodemailerMailgun.sendMail({
        from: 'myemail@example.com',
        to: ['orlando@anotherexample.com', 'orliesaurus@provider.com'], // An array if you have multiple recipients!
        subject: 'Hey you, awesome!',
        text: 'Mailgun rocks, pow pow!',
    }, function (e,r) {
    if (e) {
    	console.log('Error: '+e); 
    }
    else {
    console.log('Response: '+r);
    }
    });
    
**[1]** Quickly install dependencies

	npm install nodemailer
	npm install git+https://github.com/orliesaurus/nodemailer-mailgun-transport.git`

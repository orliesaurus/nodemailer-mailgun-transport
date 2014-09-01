nodemailer-mailgun-transport
============================

##work in progress

#What
nodemailer is an amazing node module to send emails within any of your nodejs apps.
This is the transport plugin that goes with nodemailer to send email using [Mailgun](https://mailgun.com/)'s awesomeness!
Pow Pow.

#How does it work
Create a new file, install the dependencies [1] and look at the skeleton code below to get you started quickly!



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
        //to: 'mycustomer@example.com',
        to: ['orlando@anotherexample.com', 'orliesaurus@provider.com'], // An array if you have multiple recipients!
        subject: 'Hey you, awesome!',
        text: 'Mailgun rocks, pow pow!',
    });
    
[1] Quickly install dependencies

	npm install nodemailer
	npm install git+https://github.com/orliesaurus/nodemailer-mailgun-transport.git`

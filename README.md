nodemailer-mailgun-transport
============================
[![Known Vulnerabilities](https://snyk.io/test/github/orliesaurus/nodemailer-mailgun-transport/badge.svg)](https://snyk.io/test/github/orliesaurus/nodemailer-mailgun-transport)

## What is this?
nodemailer is an amazing node module to send emails within any of your nodejs apps.
This is the transport plugin that goes with nodemailer to send email using [Mailgun](https://mailgun.com/)'s awesomeness!
Pow Pow.


## How does it work?
Based on [this mailgun-js module](https://github.com/1lobby/mailgun-js) and the [nodemailer module](https://github.com/andris9/Nodemailer), the Mailgun Transport was born. This is a transport layer, meaning it will allow you to send emails using nodemailer, using the Mailgun API instead of the SMTP protocol!

Nodemailer allows you to write code once and then swap out the transport so you can use different accounts on different providers. On top of that it's a super solid way of sending emails quickly on your node app(s).

The Mailgun transport for nodemailer is great to use when SMTP is blocked on your server or you just prefer the reliability of the web api!

## Support the project
I know this is a tiny module but many people use it in production (high5 to all of us) - if you happen to use this module please click the star button - it means a lot to all the contributors ![](https://i.snag.gy/oef5di.jpg)
## Quickstart - Example

Create a new file, install the dependencies **[1]** and look at the skeleton code below to get you started quickly!


```js
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
  auth: {
    api_key: 'key-1234123412341234',
    domain: 'one of your domain names listed at your https://mailgun.com/app/domains'
  },
  proxy: 'http://user:pass@localhost:8080' // optional proxy, default is false
}

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

nodemailerMailgun.sendMail({
  from: 'myemail@example.com',
  to: 'recipient@domain.com', // An array if you have multiple recipients.
  cc:'second@domain.com',
  bcc:'secretagent@company.gov',
  subject: 'Hey you, awesome!',
  'h:Reply-To': 'reply2this@company.com',
  //You can use "html:" to send HTML email content. It's magic!
  html: '<b>Wow Big powerful letters</b>',
  //You can use "text:" to send plain-text content. It's oldschool!
  text: 'Mailgun rocks, pow pow!'
}, (err, info) => {
  if (err) {
    console.log(`Error: ${err}`);
  }
  else {
    console.log(`Response: ${info}`);
  }
});
```
## Buffer support

Example:

```js
const mailOptions = {
    ...
    attachments: [
        {
            filename: 'text2.txt',
            content: new Buffer('hello world!','utf-8')
        },
```

with encoded string as attachment content:

```js
const mailOptions = {
    ...
    attachments: [
        {
            filename: 'text1.txt',
            content: 'aGVsbG8gd29ybGQh',
            encoding: 'base64'
        },
```

with encoded string as an inline attachment:

```js
// Replace `filename` with `cid`
const mailOptions = {
    ...
    attachments: [
        {
            cid: 'logo.png',
            content: 'aGVsbG8gd29ybGQh',
            encoding: 'base64'
        },
```
```html
<!-- Reference the `cid` in your email template file -->
<img src="cid:logo.png" alt="logo" />
```
## Address objects
The "from", "to", "cc", and "bcc" fields support an address object or array of address objects. Each "name" and "address" are converted to  ```"name <address>"``` format.  "name" is optional, "address" is required. Missing or null address in object is skipped.

Examples:
```js
 from: {name: 'Sales', address: 'sales@example.com'},
 to: [{name:'Mary', address:'mary@differentexample.com'}, {address:'john@anotherexample.com'}]

```
is converted to:
```js
  from: 'Sales <sales@example.com>',
  to: 'Mary <mary@differentexample.com>,john@anotherexample.com'
```
## Now with Consolidate.js templates

If you pass a "template" key an object that contains a "name" key, an "engine" key and, optionally, a "context" object, you can use Handlebars templates to generate the HTML for your message. Like so:

```js
const handlebars = require('handlebars');

const contextObject = {
  variable1: 'value1',
  variable2: 'value2'
};

nodemailerMailgun.sendMail({
  from: 'myemail@example.com',
  to: 'recipient@domain.com', // An array if you have multiple recipients.
  subject: 'Hey you, awesome!',
  template: {
    name: 'email.hbs',
    engine: 'handlebars',
    context: contextObject
  }
}, (err, info) => {
  if (err) {
    console.log(`Error: ${err}`);
  }
  else {
    console.log(`Response: ${info}`);
  }
});
```

You can use any of the templating engines supported by [Consolidate.js](https://github.com/tj/consolidate.js/). Just require the engine module in your script, and pass a string of the engine name to the `template` object. Please see the Consolidate.js documentation for supported engines.

## Mailgun Regions

You can use two different region environments for your mailgun domains. For USA region you should use api endpoint ```api.mailgun.net```, but for EU region ```api.eu.mailgun.net```

You can pass it as "host" to transport options object:

```js
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const options = {
  auth: {
    api_key: 'key-1234123412341234',
    domain: 'one of your domain names listed at your https://mailgun.com/app/domains'
  },
  host: 'api.eu.mailgun.net' // e.g. for EU region
}

const nodemailerMailgun = nodemailer.createTransport(mg(auth));
```


**[1]** Quickly install dependencies
```bash
npm install nodemailer
npm install nodemailer-mailgun-transport
```

## Legacy Node.js versions

Versions of Node.js before 7.6 are supported via `nodemailer-mailgun-transport/es5`.

```js
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport/es5');

```


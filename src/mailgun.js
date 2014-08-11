//
// Copyright (C) 2011 Patrick Stein
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

// TODO - better error handling on requests

// Dirt simple includes.  Nice that we can keep things simple :)
var http = require('http'),
    querystring = require('querystring');

// Mailgun options constants.  See Mailgun's API docs for details.
var MAILGUN_TAG = 'X-Mailgun-Tag',
    CAMPAIGN_ID = 'X-Campaign-Id';

// Utility dumb XML parsing helper.  Builds a regex of the form
// `<input>\s*(.*?)\s*</input>`, and memoizes for a slight optimization.
var xre = function() {
  var cache = {};

  return function(input) {
    // Try to fetch the memoized version.
    if (cache.hasOwnProperty(input)) return cache[input];

    // Otherwise build it and return it.
    var re = new RegExp('<' + input + '>\\s*(.*?)\\s*</' + input + '>', 'im');
    cache[input] = re;
    return re;
  };
}();

// This class is used to tie functionality to an API key, rather than
// using a global initialization function that forces people to use
// only one API key per application.
var Mailgun = function(apiKey) {

  // Authentication uses the api key in base64 form, so we cache that
  // here.
  this._apiKey64 = new Buffer('api:' + apiKey).toString('base64');

  this._apiKey = apiKey;
};
Mailgun.prototype = {};

// Utility method to set up required http options.
Mailgun.prototype._createHttpOptions = function(resource, method, servername) {
  return {
    host: 'mailgun.net',
    port: 80,
    method: method,
    path: '/api/' + resource + (servername ? '?servername=' + servername : ''),

    headers: {
      'Authorization': 'Basic ' + this._apiKey64
    }
  };
}

//
// Here be the email sending code.
//

Mailgun.prototype.sendText = function(sender, recipients, subject, text) {

  // These are flexible arguments, so we define them here to make
  // sure they're in scope.
  var servername = '';
  var options = {};
  var callback = null;

  // Less than 4 arguments means we're missing something that prevents
  // us from even sending an email, so we fail.
  if (arguments.length < 4)
    throw new Error('Missing required argument');

  // Flexible argument magic!
  var args = Array.prototype.slice.call(arguments, 4);
  // Pluck servername.
  if (args.length && typeof args[0] == 'string')
    servername = args.shift() || servername;
  // Pluck options.
  if (args.length && typeof args[0] == 'object')
    options = args.shift() || options;
  // Pluck callback.
  if (args.length && typeof args[0] == 'function')
    callback = args.shift() || callback;
  // Don't be messy.
  delete args;

  // We allow recipients to be passed as either a string or an array,
  // but normalize to to an array for consistency later in the
  // function.
  if (typeof(recipients) == 'string')
      recipients = [recipients];

  // Build the HTTP POST body text.
  var body = querystring.stringify({
    sender: sender,
    recipients: recipients.join(', '),
    subject: subject,
    body: text
  });
  if(options && options !== {})
    body.options = JSON.stringify(options);

  // Prepare our API request.
  var httpOptions = this._createHttpOptions('messages.txt', 'POST', servername);
  httpOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  httpOptions.headers['Content-Length'] = Buffer.byteLength(body);

  // Fire the request to Mailgun's API.
  var req = http.request(httpOptions, function(res) {

    // If the user supplied a callback, fire it and set `err` to the
    // status code of the request if it wasn't successful.
    if (callback) callback(res.statusCode != 201 ? new Error(res.statusCode) : undefined);
  });

  // Wrap up the request by sending the body, which contains the
  // actual email data we want to send.
  req.end(body);
};

Mailgun.prototype.sendRaw = function(sender, recipients, rawBody) {

  // These are flexible arguments, so we define them here to make
  // sure they're in scope.
  var servername = '';
  var callback = null;

  // Less than 3 arguments means we're missing something that prevents
  // us from even sending an email, so we fail.
  if (arguments.length < 3)
    throw new Error('Missing required argument');

  // Flexible argument magic!
  var args = Array.prototype.slice.call(arguments, 3);
  // Pluck servername.
  if (args.length && typeof args[0] == 'string')
    servername = args.shift() || servername;
  // Pluck callback.
  if (args.length && typeof args[0] == 'function')
    callback = args.shift() || callback;
  // Don't be messy.
  delete args;

  // We allow recipients to be passed as either a string or an array,
  // but normalize to to an array for consistency later in the
  // function.
  if (typeof(recipients) == 'string')
      recipients = [recipients];

  // Mailgun wants its messages formatted in a special way.  Why?
  // Who knows.
  var message = sender +
                '\n' + recipients.join(', ') +
                '\n\n' + rawBody;

  // Prepare the APi request.
  var httpOptions = this._createHttpOptions('messages.eml', 'POST', servername);
  httpOptions.headers['Content-Type'] = 'text/plain; charset=utf-8';
  httpOptions.headers['Content-Length'] = Buffer.byteLength(message);

  // Fire it.
  var req = http.request(httpOptions, function(res) {

    // If the user supplied a callback, fire it and set `err` to the
    // status code of the request if it wasn't successful.
    if (callback) callback(res.statusCode != 201 ? new Error(res.statusCode) : undefined);
  });

  // Wrap up the request by sending the message, which contains the
  // actual email data we want to send.
  req.end(message);

};

//
// Here follows the routing code
//

Mailgun.prototype.createRoute = function(pattern, destination, callback) {

  // Prep the request.
  var httpOptions = this._createHttpOptions('routes.xml', 'POST');

  // Create the HTTP POST data.
  var data = '' +
  '<route>' +
    '<pattern>' + pattern + '</pattern>' +
    '<destination>' + destination + '</destination>' +
  '</route>';

  // Prep the request.
  var httpOptions = this._createHttpOptions('routes.xml', 'POST');
  httpOptions.headers['Content-Type'] = 'text/xml';
  httpOptions.headers['Content-Length'] = Buffer.byteLength(data);

  // Fire it.
  http.request(httpOptions, function(res) {

    // Collect the data
    var data = '';
    res.on('data', function(c) { data += c });
    res.on('close', function(err) { callback(err) });
    res.on('end', function() { finish() });

    // Handle the results
    var finish = function() {

      if (res.statusCode == 201) {
        var id = xre('id').exec(data)[1];

        callback && callback(undefined, id);
      } else {
        var message = xre('message').exec(data);
        callback && callback(new Error(message ? message[1] : data));
      }
    };
  }).end(data);
};

Mailgun.prototype.deleteRoute = function(id, callback) {

  // Prep the request
  var httpOptions = this._createHttpOptions('routes/' + id + '.xml', 'DELETE');
  httpOptions.headers['Content-Type'] = 'text/xml';
  httpOptions.headers['Content-Length'] = 0;

  // Fire it.
  http.request(httpOptions, function(res) {

    if (res.statusCode == 200) {
      callback && callback(undefined);
    } else {
      var data = '';
      res.on('data', function(c) { data += c });
      res.on('close', function(err) { callback(err) });
      res.on('end', function() {
        var message = xre('message').exec(data);
        callback && callback(new Error(message ? message[1] : data))
      });
    }
  }).end();
};

Mailgun.prototype.getRoutes = function(callback) {

  // Some sanity checking.  It makes no sense to call this without a
  // callback.
  if (typeof callback != 'function') throw new Error('Callback must be a function');

  // Prep the request.
  var httpOptions = this._createHttpOptions('routes.xml', 'GET');

  // Fire it.
  http.request(httpOptions, function(res) {

    // Check for failure
    if (res.statusCode != 200)
      return callback(res.statusCode);

    // We're going to be a little lazy and just eat up all the data
    // before parsing it.
    var data = '';
    res.on('data', function(c) {
      data += c;
    });

    // Handle catastrophic failures with an error
    res.on('close', function(err) {
      // FIXME - In some cases this could cause the callback to be called
      //         with an error, even after we called it successfully.
      callback(err.code);
    });

    // Once the request is done, we have all the data and can parse it.
    res.on('end', function() {

      // Silly XML parsing because I don't want to include another
      // dependency.  Fortunately the structure is very simple and
      // convenient to parse with this method.
      var routes = data.replace(/\s/g, '').match(xre('route'));
      var nroutes = [];
      for (var i=0; i<routes.length; i++) {

        // Pull the route out, since we're going to change it.
        var route = routes[i];

        // Pull the data.
        var r = {};
        r.pattern = xre('pattern').exec(route)[1];
        r.destination = xre('destination').exec(route)[1];
        r.id = xre('id').exec(route)[1];
        nroutes.push(r);
      }

      // Send the data to the callback.
      callback(undefined, nroutes);

    });
  }).end();
};

exports.Mailgun = Mailgun;
exports.MAILGUN_TAG = MAILGUN_TAG;
exports.CAMPAIGN_ID = CAMPAIGN_ID;

module.exports = exports;


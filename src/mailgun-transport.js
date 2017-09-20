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
  'inline',
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

var transformList = [
  'replyTo'
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
    function (done) {
      if (mailData.template && mailData.template.name && mailData.template.engine) {
        mailData.template.context = mailData.template.context || {};
        cons[mailData.template.engine](mailData.template.name, mailData.template.context, function (err, html) {
          if (err) throw err;
          mailData.html = html;
          done();
        });
      } else {
        done();
      }
    },
    function(done){
      //convert address objects or array of objects to strings if present
      var targets =['from','to','cc','bcc','replyTo'];
      var count =0;
      for (var target of targets){
        var addrsData = mailData[target];
        if(addrsData !== null && (typeof addrsData === 'object' || Array.isArray(addrsData))){
          var addrs= [];
          var addresses = typeof addrsData === 'object' ? [addrsData] : addrsData;
          for (var addr of addresses ){
                if (Array.isArray(addr)){
                  for (var add of addr){
                    if(typeof add === 'object' && add.address){
                      var final = add.name ? add.name + ' <' + add.address + '>' : add.address
                      addrs.push(final);
                    } else if (typeof add === 'string') {
                      addrs.push(add)
                    }
                  }
                } else{
                  if(addr.address){
                    var final = addr.name ? addr.name + ' <' + addr.address + '>' : addr.address
                    addrs.push(final);
                  }
                }
          }
          mailData[target] = addrs.join();
        }
        count++;
        count == 5 ? done():null;
      }
    },
    function (done) {
      // convert nodemailer attachments to mailgun-js attachements
      if (mailData.attachments) {
        var attachment, mailgunAttachment, data, attachmentList = [], inlineList = [];
        for (var i in mailData.attachments) {
          attachment = mailData.attachments[i];

          // mailgunjs does not encode content string to a buffer
          if (typeof attachment.content === 'string') {
            data = new Buffer(attachment.content, attachment.encoding);
          } else {
            data = attachment.content || attachment.path || undefined;
          }
          //console.log(data);
          mailgunAttachment = new self.mailgun.Attachment({
            data: data,
            filename: attachment.cid || attachment.filename || undefined,
            contentType: attachment.contentType || undefined,
            knownLength: attachment.knownLength || undefined
          });

          if (attachment.cid) {
            inlineList.push(mailgunAttachment);
          } else {
            attachmentList.push(mailgunAttachment);
          }
          //console.log(b);
        }

        mailData.attachment = attachmentList;
        mailData.inline = inlineList;
        delete mailData.attachments;
      }

      delete mailData.headers;

      transformList.forEach( function(key) {
        if (mailData[key]) {
          switch (key) {
            case 'replyTo': 
              mailData['h:Reply-To'] = mailData[key];
              delete mailData[key];
          }
        }
      });

      var options = pickBy(mailData, function (value, key) {
        if (whitelistExact.indexOf(key) !== -1) {
          return true;
        }

        return some(whitelistPrefix, function (prefix) {
          return startsWith(key, prefix);
        });
      });

      self.messages.send(options, function (err, data) {
        if (data) {
          data.messageId = data.id;
        }
        callback(err || null, data);
      });
    }
  ], function (err) {
    if (err) throw err;
  });
};

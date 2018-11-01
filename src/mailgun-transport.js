'use strict';

const Mailgun = require('mailgun-js');
const cons = require('consolidate');
const packageData = require('../package.json');

const whitelistExact = [
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
  'o:skip-verification',
  'X-Mailgun-Variables'
];
const whitelistPrefix = [
  'h:',
  'v:'
];

const transformList = [
  {
    nodemailerKey: 'replyTo',
    mailgunKey: 'h:Reply-To'
  }
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
    domain: this.options.auth.domain || '',
    proxy: this.options.proxy || false,
    host: this.options.host || 'api.mailgun.net',
    protocol: this.options.protocol || 'https:',
    port: this.options.port || 443
  });
  this.messages = this.mailgun.messages();
}

MailgunTransport.prototype.send = function send(mail, callback) {
  const self = this;
  const mailData = mail.data;
  const resolveTemplate = () => {
    return new Promise((resolve, reject) => {
      if (mailData.template && mailData.template.name && mailData.template.engine) {
        mailData.template.context = mailData.template.context || {};
        cons[mailData.template.engine](mailData.template.name, mailData.template.context, (err, html) => {
          if (err) {
            reject(err);
          }
          mailData.html = html;
          resolve();
        });
      } else {
        resolve();
      }
    })
  }
  const convertAddressesToStrings = () => {
    // convert address objects or array of objects to strings if present
    const targets = ['from','to','cc','bcc','replyTo'];
    for (const target of targets) {
      const addrsData = mailData[target];
      if (addrsData !== null && (typeof addrsData === 'object' || Array.isArray(addrsData))) {
        const addrs= [];
        const addresses = typeof addrsData === 'object' ? [addrsData] : addrsData;
        for (const addr of addresses ) {
          if (Array.isArray(addr)) {
            for (const add of addr) {
              if (typeof add === 'object' && add.address) {
                const final = add.name ? add.name + ' <' + add.address + '>' : add.address
                addrs.push(final);
              } else if (typeof add === 'string') {
                addrs.push(add);
              }
            }
          } else {
            if (addr.address) {
              const final = addr.name ? addr.name + ' <' + addr.address + '>' : addr.address;
              addrs.push(final);
            }
          }
        }
        mailData[target] = addrs.join();
      }
    }
  }
  const resolveAttachments = () => {
    // convert nodemailer attachments to mailgun-js attachments
    if (mailData.attachments) {
      let mailgunAttachment, data, attachmentList = [], inlineList = [];
      for (const attachment of mailData.attachments) {
        // mailgunjs does not encode content string to a buffer
        if (typeof attachment.content === 'string') {
          data = Buffer.from(attachment.content, attachment.encoding);
        } else {
          data = attachment.content || attachment.path || undefined;
        }
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
      }

      mailData.attachment = attachmentList;
      mailData.inline = inlineList;
      delete mailData.attachments;
    }
  }
  const transformMailData = () => {
    delete mailData.headers;

    for (const transform of transformList) {
      if (mailData[transform.nodemailerKey]) {
        mailData[transform.mailgunKey] = mailData[transform.nodemailerKey]
        delete mailData[transform.nodemailerKey]
      }
    }
  }
  const sendMail = () => {
    return new Promise((resolve, reject) => {
      const options = Object.keys(mailData)
        .filter(key => whitelistExact.find(whitelistExactKey => whitelistExactKey === key) || whitelistPrefix.find(whitelistPrefixKey => key.startsWith(whitelistPrefixKey)))
        .reduce((obj, key) => {
          obj[key] = mailData[key];
          return obj;
        }, {});

      self.messages.send(options, (err, data) => {
        if (data) {
          data.messageId = data.id;
        }
        if (err) {
          reject(err)
        }
        resolve(data)
      });
    })
  }
  convertAddressesToStrings();
  transformMailData();
  resolveTemplate()
    .then(resolveAttachments)
    .then(sendMail)
    .then((data) => {
      callback(null, data);
    }).catch((err) => {
      callback(err);
    })
};

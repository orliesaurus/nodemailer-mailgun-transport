'use strict'

const Mailgun = require('mailgun-js')
const cons = require('consolidate')
const packageData = require('../package.json')
const series = require('async-series')
const pickBy = require('lodash.pickby')
const some = require('lodash.some')
const startsWith = require('lodash.startswith')
const request = require('request')

const whitelistExact = [
  'from',
  'to',
  'h:Reply-To',
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
]
const whitelistPrefix = [
  'h:',
  'v:'
]

module.exports = function (options) {
  return new MailgunTransport(options)
}

function MailgunTransport (options) {
  this.options = options || {}
  this.name = 'Mailgun'
  this.version = packageData.version
  this.mailgun = Mailgun({
    apiKey: this.options.auth.api_key,
    domain: this.options.auth.domain || ''
  })
  this.messages = this.mailgun.messages()
}

MailgunTransport.prototype.send = function send (mail, callback) {
  const isURL = (str) => {
    /* eslint-disable */
    const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/
    if (!regex.test(str)) {
      return false
    } else {
      return true
    }
  }

  const self = this
  const mailData = mail.data
  series([
    function (done) {
      if (mailData.template && mailData.template.name && mailData.template.engine) {
        mailData.template.context = mailData.template.context || {}
        cons[mailData.template.engine](mailData.template.name, mailData.template.context, function (err, html) {
          if (err) throw err
          mailData.html = html
          done()
        })
      } else {
        done()
      }
    },
    function (done) {
      // convert address objects or array of objects to strings if present
      const targets = ['from', 'to', 'cc', 'bcc', 'replyTo']
      for (let target of targets) {
        if (target === 'replyTo') {
          const newTarget = 'h:Reply-To'
          mailData[newTarget] = mailData[target]
          delete mailData[target]
          target = newTarget
        }
        const addressData = mailData[target]
        if (addressData !== null && (typeof addressData === 'object' || Array.isArray(addressData))) {
          const addrs = []
          const addresses = typeof addressData === 'object' ? [addressData] : addressData
          for (let addr of addresses) {
            if (Array.isArray(addr)) {
              for (let add of addr) {
                if (typeof add === 'object' && add.address) {
                  const addr = add.name ? add.name + ' <' + add.address + '>' : add.address
                  addrs.push(addr)
                } else if (typeof add === 'string') {
                  addrs.push(add)
                }
              }
            } else {
              if (addr.address) {
                const addr = addr.name ? addr.name + ' <' + addr.a + '>' : addr.address
                addrs.push(addr)
              }
            }
          }
          mailData[target] = addrs.join()
        }
      }
      done()
    },
    async function (done) {
      // convert nodemailer attachments to mailgun-js attachements
      if (mailData.attachments) {
        let attachment
        let mailgunAttachment
        let data
        const attachmentList = []
        const inlineList = []
        for (let i in mailData.attachments) {
          attachment = mailData.attachments[i]
          // mailgunjs does not encode content string to a buffer
          const remoteFile = attachment.path || attachment.href || attachment.full_path || undefined
          if (remoteFile && isURL(remoteFile)) {
            mailgunAttachment = await request(remoteFile)
          } else {
            if (typeof attachment.content === 'string') {
              data = Buffer.from(attachment.content, attachment.encoding)
            } else {
              data = attachment.content || attachment.path || undefined
            }

            mailgunAttachment = new self.mailgun.Attachment({
              data: data,
              filename: attachment.cid || attachment.filename || undefined,
              contentType: attachment.contentType || undefined,
              knownLength: attachment.knownLength || undefined
            })
          }

          if (attachment.cid) {
            inlineList.push(mailgunAttachment)
          } else {
            attachmentList.push(mailgunAttachment)
          }
        }

        mailData.attachment = attachmentList
        mailData.inline = inlineList
        delete mailData.attachments
      }
      delete mail.data.headers
      const options = pickBy(mailData, function (value, key) {
        if (whitelistExact.indexOf(key) !== -1) {
          return true
        }
        return some(whitelistPrefix, function (prefix) {
          return startsWith(key, prefix)
        })
      })

      self.messages.send(options, function (err, data) {
        callback(err || null, data)
      })
    }
  ], function (err) {
    if (err) throw err
  })
}

var chai = require('chai');
chai.use(require('sinon-chai'));
require('mocha-sinon');
var expect = chai.expect;
var MailgunTransport = require('../src/mailgun-transport');

describe('when sending a mail', function () {
  beforeEach(function () {
    this.transport = new MailgunTransport({
      auth: {
        api_key: 'test'
      }
    });

    this.sinon.stub(this.transport.messages, 'send').callsArgWith(1, null, {
      id: '<20111114174239.25659.5817@samples.mailgun.org>',
      message: 'Queued. Thank you.'
    });
  });

  describe('with allowed data', function () {
    it('should send all the data to mailgun', function (done) {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: 'to@bar.com',
        cc: 'cc@bar.com',
        bcc: 'bcc@bar.com',
        subject: 'Subject',
        text: 'Hello',
        html: '<b>Hello</b>',
        attachment: [],
        'o:tag': 'Tag',
        'o:campaign': 'Campaign',
        'o:dkim': 'yes',
        'o:deliverytime': 'Thu, 13 Oct 2011 18:02:00 GMT',
        'o:testmode': 'yes',
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes',
        'o:require-tls': 'yes',
        'o:skip-verification': 'yes',
        'h:Reply-To': 'reply@bar.com',
        'v:foo': 'bar'
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          cc: 'cc@bar.com',
          bcc: 'bcc@bar.com',
          subject: 'Subject',
          text: 'Hello',
          html: '<b>Hello</b>',
          attachment: [],
          'o:tag': 'Tag',
          'o:campaign': 'Campaign',
          'o:dkim': 'yes',
          'o:deliverytime': 'Thu, 13 Oct 2011 18:02:00 GMT',
          'o:testmode': 'yes',
          'o:tracking': 'yes',
          'o:tracking-clicks': 'yes',
          'o:tracking-opens': 'yes',
          'o:require-tls': 'yes',
          'o:skip-verification': 'yes',
          'h:Reply-To': 'reply@bar.com',
          'v:foo': 'bar'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });

    it('should convert attachments to Mailgun format', function (done) {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        attachment: [{
          path: '/',
          filename: 'CONTRIBUTORS.md',
          contentType: 'text/markdown',
          knownLength: 122
        }]
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledOnce;
        var call = self.transport.messages.send.getCall(0);
        expect(call.args[0].attachment).to.have.length(1);
        var attachment = call.args[0].attachment[0];
        expect(attachment.path).to.equal('/');
        expect(attachment.filename).to.equal('CONTRIBUTORS.md');
        expect(attachment.contentType).to.equal('text/markdown');
        expect(attachment.knownLength).to.equal(122);
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });

    it('allow using array to assgin multiple receiver', function (done) {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: ['to@bar.com', 'to1@bar.com'],
        subject: 'Subject',
        text: 'Hello',
        html: '<b>Hello</b>',
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com,to1@bar.com',
          subject: 'Subject',
          text: 'Hello',
          html: '<b>Hello</b>',
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });

  describe('with disallowed data', function () {
    it('should filter out the invalid data', function (done) {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        foo: 'bar'
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          subject: 'Subject',
          text: 'Hello'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });

  describe('when referencing a template file', function() {
    it('should insert variables and send the data as HTML', function() {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        template: {
          name: 'test_template.hbs',
          engine: 'handlebars',
          context: {
            variable1: 'Passed!'
          }
        },
        foo: 'bar'
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          subject: 'Subject',
          html: '<body><h1>Passed!</h1></body>'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });

  describe('with simple address objects', function () {
    it('should convert to standard address format', function (done) {
      var self = this;

      var data = {
        from: {"name":'From', "address":'from@bar.com'},
        to: {"name":'To', "address":'to@bar.com'},
        cc: {"name":'Cc', "address":'cc@bar.com'},
        bcc: {"name":'Bcc', "address":'bcc@bar.com'},
        subject: 'Subject',
        text: 'Hello',
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'From <from@bar.com>',
          to: 'To <to@bar.com>',
          cc: 'Cc <cc@bar.com>',
          bcc: 'Bcc <bcc@bar.com>',
          subject: 'Subject',
          text: 'Hello'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });

  describe('with address objects missing data or having multiple entries (array of objects)', function () {
    it('should convert to standard address format and skip missing data', function (done) {
      var self = this;

      var data = {
        from: {"name": null, "address":'from@bar.com'},
        to: [{"name":'To', "address":'to@bar.com'}, {"name":null, "address":"to2@bar.com"}, {"address":"to3@bar.com"},{"name":undefined,"address":undefined}],
        cc: [{"name":'Cc', "address":'cc@bar.com'}, {"name":null, "address":"cc2@bar.com"}, {"address":"cc3@bar.com"},{"name":"","address":""}],
        bcc: [{"name":'Bcc', "address":'bcc@bar.com'}, {"name":null, "address":"bcc2@bar.com"}, {"address":"bcc3@bar.com"},{"name":"Bcc4"}],
        replyTo: {"name":'ReplyTo', "address":'replyto@bar.com'},
        subject: 'Subject',
        text: 'Hello',
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'To <to@bar.com>,to2@bar.com,to3@bar.com',
          cc: 'Cc <cc@bar.com>,cc2@bar.com,cc3@bar.com',
          bcc: 'Bcc <bcc@bar.com>,bcc2@bar.com,bcc3@bar.com',
          'h:Reply-To': 'ReplyTo <replyto@bar.com>',
          subject: 'Subject',
          text: 'Hello'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });

  describe('with a replyTo address set', function () {
    it('should convert it to "h:Reply-To" property ', function (done) {
      var self = this;

      var data = {
        from: 'from@bar.com',
        to: 'to@bar.com',
        replyTo: 'replyto@bar.com',
        subject: 'Subject',
        text: 'Hello',
      };
      this.transport.send({
        data: data
      }, function (err, info) {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          'h:Reply-To': 'replyto@bar.com',
          subject: 'Subject',
          text: 'Hello'
        });
        expect(err).to.be.null;
        expect(info.messageId).to.equal('<20111114174239.25659.5817@samples.mailgun.org>');
        done();
      });
    });
  });
});
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

    this.sinon.stub(this.transport.messages, 'send').callsArg(1);
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
        attachments: [],
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
      }, function () {
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
        attachments: [{
          path: '/',
          filename: 'CONTRIBUTORS.md',
          contentType: 'text/markdown',
          knownLength: 122
        }]
      };
      this.transport.send({
        data: data
      }, function () {
        expect(self.transport.messages.send).to.have.been.calledOnce;
        var call = self.transport.messages.send.getCall(0);
        expect(call.args[0].attachment).to.have.length(1);
        var attachment = call.args[0].attachment[0];
        expect(attachment.data).to.equal('/');
        expect(attachment.filename).to.equal('CONTRIBUTORS.md');
        expect(attachment.contentType).to.equal('text/markdown');
        expect(attachment.knownLength).to.equal(122);
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
      }, function () {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          subject: 'Subject',
          text: 'Hello'
        });
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
      }, function () {
        expect(self.transport.messages.send).to.have.been.calledWith({
          from: 'from@bar.com',
          to: 'to@bar.com',
          subject: 'Subject',
          html: '<body><h1>Passed!</h1></body>'
        });
        done();
      });
    });
  });
});

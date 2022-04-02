import MailgunTransport, { MailgunTransportSendMailOptions } from '../src';
import Mailgun from 'mailgun.js';
import nodemailer from 'nodemailer';

jest.mock('mailgun.js');

const mockMailgun = (createMessage: any) => {
  (Mailgun as any).mockImplementation(() => ({
    client: () => ({
      messages: {
        create: createMessage,
      },
    }),
  }));
  return createMessage;
};
const sendMail = (data: MailgunTransportSendMailOptions) =>
  new Promise((resolve, reject) => {
    nodemailer
      .createTransport(
        MailgunTransport({
          auth: {
            apiKey: 'foo',
            domain: 'bar',
          },
        })
      )
      .sendMail(data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
  });
const configTestSuite = (...args: Parameters<typeof MailgunTransport>) => {
  const client = jest.fn().mockImplementation(() => ({ messsages: {} }));
  (Mailgun as any).mockImplementation(() => ({
    client,
  }));
  MailgunTransport(...args);
  return client.mock.calls[0];
};
const testSuite = async (data: MailgunTransportSendMailOptions) => {
  const createMessage = mockMailgun(
    jest.fn().mockImplementation(async (_domain: any, _data: any) => ({
      id: '<20111114174239.25659.5817@samples.mailgun.org>',
      message: 'Queued. Thank you.',
    }))
  );
  await sendMail(data);
  return createMessage.mock.calls[0];
};

describe('Mailgun transport', () => {
  it('should allow custom url with host', () => {
    expect(
      configTestSuite({
        auth: {
          apiKey: 'api-key',
          domain: 'bar',
        },
        host: 'api.mailgun.com',
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "key": "api-key",
          "timeout": undefined,
          "url": "https://api.mailgun.com/",
          "username": "api",
        },
      ]
    `);
  });

  it('should allow custom url with all fields', () => {
    expect(
      configTestSuite({
        auth: {
          apiKey: 'api-key',
          domain: 'bar',
        },
        host: 'api.mailgun.com',
        protocol: 'http:',
        port: 8080,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "key": "api-key",
          "timeout": undefined,
          "url": "http://api.mailgun.com:8080/",
          "username": "api",
        },
      ]
    `);
  });

  it('should allow custom url with url field', () => {
    expect(
      configTestSuite({
        auth: {
          apiKey: 'api-key',
          domain: 'bar',
        },
        url: 'http://api.mailgun.com:8080',
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "key": "api-key",
          "timeout": undefined,
          "url": "http://api.mailgun.com:8080",
          "username": "api",
        },
      ]
    `);
  });

  it('should send a mail', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        cc: 'cc@bar.com',
        bcc: 'bcc@bar.com',
        subject: 'Subject',
        text: 'Hello',
        html: '<b>Hello</b>',
        replyTo: 'reployto@bar.com',
        attachments: [],
        ...({
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
          'v:foo': 'bar',
        } as any),
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "bcc": "bcc@bar.com",
          "cc": "cc@bar.com",
          "from": "from@bar.com",
          "h:Reply-To": "reployto@bar.com",
          "html": "<b>Hello</b>",
          "o:campaign": "Campaign",
          "o:deliverytime": "Thu, 13 Oct 2011 18:02:00 GMT",
          "o:dkim": "yes",
          "o:require-tls": "yes",
          "o:skip-verification": "yes",
          "o:tag": "Tag",
          "o:testmode": "yes",
          "o:tracking": "yes",
          "o:tracking-clicks": "yes",
          "o:tracking-opens": "yes",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
          "v:foo": "bar",
        },
      ]
    `);
  });

  it('should convert attachments to Mailgun format', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        attachments: [
          {
            path: '/',
            filename: 'CONTRIBUTORS.md',
            contentType: 'text/markdown',
            knownLength: 122,
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "attachment": Array [
            Object {
              "contentType": "text/markdown",
              "data": "/",
              "filename": "CONTRIBUTORS.md",
              "knownLength": 122,
            },
          ],
          "from": "from@bar.com",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
        },
      ]
    `);
  });

  it('should convert inline attachments to Mailgun format', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        attachments: [
          {
            cid: 'logo.png',
            content: 'aGVsbG8gd29ybGQh',
            encoding: 'base64',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "inline": Array [
            Object {
              "contentType": undefined,
              "data": Object {
                "data": Array [
                  104,
                  101,
                  108,
                  108,
                  111,
                  32,
                  119,
                  111,
                  114,
                  108,
                  100,
                  33,
                ],
                "type": "Buffer",
              },
              "filename": "logo.png",
              "knownLength": undefined,
            },
          ],
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
        },
      ]
    `);
  });

  it('should allow using array to assign multiple receiver', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: ['to@bar.com', 'to1@bar.com'],
        subject: 'Subject',
        text: 'Hello',
        html: '<b>Hello</b>',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "html": "<b>Hello</b>",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com,to1@bar.com",
        },
      ]
    `);
  });

  it('should filter out the invalid data', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        ...{
          foo: 'bar',
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
        },
      ]
    `);
  });

  it('should pass the template variables and template to mailgun for mailgun to process', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        ...{
          template: 'boss_door',
          'h:X-Mailgun-Variables': JSON.stringify({ key: 'boss' }),
          foo: 'bar',
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "h:X-Mailgun-Variables": "{\\"key\\":\\"boss\\"}",
          "subject": "Subject",
          "template": "boss_door",
          "to": "to@bar.com",
        },
      ]
    `);
  });

  it('should convert to standard address format', async () => {
    expect(
      await testSuite({
        from: { name: 'From', address: 'from@bar.com' },
        to: { name: 'To', address: 'to@bar.com' },
        cc: { name: 'Cc', address: 'cc@bar.com' },
        bcc: { name: 'Bcc', address: 'bcc@bar.com' },
        subject: 'Subject',
        text: 'Hello',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "bcc": "Bcc <bcc@bar.com>",
          "cc": "Cc <cc@bar.com>",
          "from": "From <from@bar.com>",
          "subject": "Subject",
          "text": "Hello",
          "to": "To <to@bar.com>",
        },
      ]
    `);
  });

  it('should convert to standard address format with broken data and multiple addresses', async () => {
    expect(
      await testSuite({
        from: { name: null, address: 'from@bar.com' } as any,
        to: [
          { name: 'To', address: 'to@bar.com' },
          { name: null, address: 'to2@bar.com' },
          { address: 'to3@bar.com' } as any,
          { name: undefined, address: undefined },
        ],
        cc: [
          { name: 'Cc', address: 'cc@bar.com' },
          { name: null, address: 'cc2@bar.com' },
          { address: 'cc3@bar.com' } as any,
          { name: '', address: '' },
        ],
        bcc: [
          { name: 'Bcc', address: 'bcc@bar.com' },
          { name: null, address: 'bcc2@bar.com' },
          { address: 'bcc3@bar.com' } as any,
          { name: 'Bcc4' },
        ],
        replyTo: { name: 'ReplyTo', address: 'replyto@bar.com' },
        subject: 'Subject',
        text: 'Hello',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "bcc": "Bcc <bcc@bar.com>,bcc2@bar.com,bcc3@bar.com,Bcc4 <undefined>",
          "cc": "Cc <cc@bar.com>,cc2@bar.com,cc3@bar.com",
          "from": "from@bar.com",
          "h:Reply-To": "ReplyTo <replyto@bar.com>",
          "subject": "Subject",
          "text": "Hello",
          "to": "To <to@bar.com>,to2@bar.com,to3@bar.com",
        },
      ]
    `);
  });

  it('should transform fields like h;Reply-To', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        replyTo: 'replyto@bar.com',
        subject: 'Subject',
        text: 'Hello',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "h:Reply-To": "replyto@bar.com",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
        },
      ]
    `);
  });

  it('should allow custom message-id', async () => {
    expect(
      await testSuite({
        from: 'from@bar.com',
        to: 'to@bar.com',
        subject: 'Subject',
        text: 'Hello',
        messageId: '<9e5cb9a0-852d-405c-8062-61886814e64c@samples.mailgun.org>',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "bar",
        Object {
          "from": "from@bar.com",
          "h:Message-Id": "<9e5cb9a0-852d-405c-8062-61886814e64c@samples.mailgun.org>",
          "subject": "Subject",
          "text": "Hello",
          "to": "to@bar.com",
        },
      ]
    `);
  });
});

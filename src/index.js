const mailgun = require("mailgun-js");
const Attachment = require("mailgun-js/lib/attachment");
const consolidate = require("consolidate");
const packageData = require("../package.json");

const whitelist = [
  ["replyTo", "h:Reply-To"],
  ["messageId", "h:Message-Id"],
  [/^h:/],
  [/^v:/],
  ["from"],
  ["to"],
  ["cc"],
  ["bcc"],
  ["subject"],
  ["text"],
  ["template"],
  ["html"],
  ["attachment"],
  ["inline"],
  ["recipient-variables"],
  ["o:tag"],
  ["o:campaign"],
  ["o:dkim"],
  ["o:deliverytime"],
  ["o:testmode"],
  ["o:tracking"],
  ["o:tracking-clicks"],
  ["o:tracking-opens"],
  ["o:require-tls"],
  ["o:skip-verification"],
  ["X-Mailgun-Variables"]
];

const applyKeyWhitelist = mail =>
  Object.keys(mail).reduce((acc, key) => {
    const targetKey = whitelist.reduce((result, [cond, target]) => {
      if (result) {
        return result;
      }
      if ((cond.exec && cond.exec(key)) || cond === key) {
        return target || key;
      }
      return null;
    }, null);
    if (!targetKey || !mail[key]) {
      return acc;
    }
    return { ...acc, [targetKey]: mail[key] };
  }, {});

const renderTemplate = async template => {
  if (!template || typeof template === "string" || !template.name || !template.engine) {
    // either there's no template or the caller is requesting a mailgun template
    // so let everything through unaltered
    return {};
  }
  const { engine, name, context = {} } = template;
  const html = await consolidate[engine](name, context);
  return { template: null, html };
};

const makeMailgunAttachments = (attachments = []) => {
  const [attachment, inline] = attachments.reduce(
    (results, item) => {
      const data =
        typeof item.content === "string"
          ? Buffer.from(item.content, item.encoding)
          : item.content || item.path || undefined;
      // mailgunjs does not encode content string to a buffer
      const attachment = new Attachment({
        data,
        filename: item.cid || item.filename || undefined,
        contentType: item.contentType || undefined,
        knownLength: item.knownLength || undefined
      });
      const [attachmentAttachments, inlineAttachments] = results;
      return [
        attachmentAttachments.concat(!item.cid ? attachment : []),
        inlineAttachments.concat(item.cid ? attachment : [])
      ];
    },
    [[], []]
  );
  return {
    ...(attachment.length ? { attachment } : {}),
    ...(inline.length ? { inline } : {})
  };
};

const makeAllTextAddresses = mail => {
  const keys = ["from", "to", "cc", "bcc", "replyTo"];
  const makeTextAddresses = addresses => {
    const validAddresses = [].concat(addresses).filter(Boolean);
    const textAddresses = validAddresses.map(item =>
      item.address
        ? item.name
          ? item.name + " <" + item.address + ">"
          : item.address
        : typeof item === "string"
        ? item
        : null
    );
    return textAddresses.filter(Boolean).join();
  };
  const result = keys.reduce((result, key) => {
    const textAddresses = makeTextAddresses(mail[key]);
    if (!textAddresses) {
      return result;
    }
    return { ...result, [key]: textAddresses };
  }, {});
  return result;
};

const send = mailgunSend => async ({ data: mail }, callback) => {
  try {
    const addresses = makeAllTextAddresses(mail);
    const attachments = makeMailgunAttachments(mail.attachments);
    const template = await renderTemplate(mail.template);
    const extendedMail = {
      ...mail,
      ...addresses,
      ...attachments,
      ...template
    };
    const whitelistedMail = applyKeyWhitelist(extendedMail);
    const result = await mailgunSend(whitelistedMail);
    callback(null, { ...result, messageId: result.id });
  } catch (error) {
    callback(error);
  }
};

const transport = (options = {}) => {
  const messages = mailgun({
    apiKey: options.auth.api_key || options.auth.apiKey,
    domain: options.auth.domain || "",
    proxy: options.proxy || false,
    host: options.host || "api.mailgun.net",
    protocol: options.protocol || "https:",
    port: options.port || 443
  }).messages();
  const mailgunSend = mail => messages.send(mail);
  return {
    name: "Mailgun",
    version: packageData.version,
    send: send(mailgunSend),
    messages,
    options
  };
};

transport._send = send;
transport._makeAllTextAddresses = makeAllTextAddresses;
transport._makeMailgunAttachments = makeMailgunAttachments;
transport._renderTemplate = renderTemplate;
transport._applyKeyWhitelist = applyKeyWhitelist;

module.exports = transport;

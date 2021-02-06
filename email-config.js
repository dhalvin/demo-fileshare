const nodemailer = require('nodemailer');
const logger = require('./logger');
const SENDER_ADDRESS = 'admin@hanessassociates.com';
const mailKey = require(process.env.MAIL_KEYFILE || './gsuite_nodemailer.json');

function sendMail(res, template, options, recipient) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: SENDER_ADDRESS,
      serviceClient: mailKey.client_id,
      privateKey: mailKey.private_key
    }
  });
  options.layout = "email";
  res.render(template, options, async function (error, html) {
    if (error) throw error;
    try {
      await transporter.verify();
      await transporter.sendMail({
        from: SENDER_ADDRESS,
        to: recipient,
        subject: options.subject,
        html: html
      });
    }
    catch (err) {
      logger.error(err);
    }
  });

}

module.exports.sendMail = sendMail;
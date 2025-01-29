import nodemailer from 'nodemailer';
import { StormAlertData, StormAlertEmail } from '../types/email';
import ejs from 'ejs';
import path from 'path';
import { encodeImageToBase64 } from './image';

/**
 *
 *  from: '"Fred Foo 👻" <foo@example.com>', // sender address
 *  to: 'bar@example.com', // list of receivers
 *  subject: 'Hello ✔', // Subject line
 *  text: 'Hello world?', // plain text body
 *  html: '<b>Hello world?</b>', // html body
 */
export async function sendEmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const password = process.env.PRISM_ALERTS_EMAIL_PASSWORD;
  const host =
    process.env.PRISM_ALERTS_EMAIL_HOST || 'email-smtp.eu-west-1.amazonaws.com';
  const user = process.env.PRISM_ALERTS_EMAIL_USER || 'AKIAWZYYAAWJ4JNCYOO7'; // wfp.prism@wfp.org

  if (!(password && user)) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    const testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.debug('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    console.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: {
      user,
      pass: password,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  console.debug(`Message sent using ${user}`);
}

/**
 * Sends a storm alert email using an EJS template.
 * This function constructs an email with storm alert details.
 *
 * @param {StormAlertData} data - The storm alert details.
 * @param {string} data.email - Recipient's email address.
 * @param {string} data.cycloneName - Name of the cyclone.
 * @param {Date} data.cycloneTime - The reference date of the cyclone.
 * @param {string[]} data.districts48kt - Districts affected by 48kt winds.
 * @param {string[]} data.districts64kt - Districts affected by 64kt winds.
 * @param {string} data.redirectUrl - URL to access the anticipatory action storm map.
 * @param {string} data.windspeed - Wind speed at alert time.
 * @param {string} data.base64Image - Base64-encoded image of the storm.
 *
 * @returns {Promise<void>} - Resolves when the email is sent.
 */

const sendStormAlertEmail = async (data: StormAlertData): Promise<void> => {
    const emailData: StormAlertEmail = {
        cycloneName: data.cycloneName,
        cycloneTime: data.cycloneTime,
        districts48kt: data.districts48kt,
        districts64kt: data.districts64kt,
        redirectUrl: data.redirectUrl,
        base64Image: data.base64Image,
        icons: {
            mapIcon: `data:image/png;base64,${encodeImageToBase64('icons/mapIcon.png')}`,
            arrowForwardIcon: `data:image/png;base64,${encodeImageToBase64('icons/arrowForwardIcon.png')}`,
        },
        unsubscribeUrl: '',
        windspeed: data.windspeed,
    };

    const mailOptions = {
        from: 'wfp.prism@wfp.org',
        to: data.email,
        subject: `Activation Triggers activated ${data.windspeed} for ${data.cycloneName}`,
        html: '',
        text: '',
    };

    try {
      const html: string = await new Promise((resolve, reject) => {
          ejs.renderFile(path.join(__dirname, 'templates', 'storm-alert.ejs'), emailData, (err, result) => {
              if (err) {
                  return reject(err);
              }
              resolve(result);
          });
      });

      mailOptions.html = html;
      await sendEmail(mailOptions);
  } catch (error) {
      console.error('Error sending storm alert email:', error);
      throw error;
  }
};


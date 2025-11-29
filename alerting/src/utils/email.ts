import nodemailer from 'nodemailer';
import { StormAlertData, StormAlertEmail } from '../types/storm-email';
import { FloodAlertEmailData } from '../types/flood-email';
import ejs from 'ejs';
import path from 'path';
import { displayWindState, WindState } from 'prism-common';

/**
 *
 *  from: '"Fred Foo 👻" <foo@example.com>', // sender address
 *  to: 'bar@example.com', // list of receivers
 *  subject: 'Hello ✔', // Subject line
 *  text: 'Hello world?', // plain text body
 *  html: '<b>Hello world?</b>', // html body
 *  attachments: [{
          filename: 'icon.png', 
          path: path.join(__dirname, '../images/icon.png'),
          cid: 'icon-cid'
        },
         {
          filename: 'image.png',
          content: data.base64Image,
          encoding: 'base64',
          cid: 'image-cid'}] // attachments files
 */
export async function sendEmail({
  from,
  to,
  bcc,
  subject,
  text,
  html,
  attachments,
}: {
  from: string;
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    path?: string;
    content?: string;
    encoding?: string;
    cid: string;
  }[];
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
      bcc,
      subject,
      text,
      html,
      attachments,
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
    bcc,
    subject,
    text,
    html,
    attachments,
  });

  console.debug(`Message sent using ${user}`);
}

/**
 * Sends a storm alert email using an EJS template.
 * This function constructs an email with storm alert details.
 *
 * @param {StormAlertData} data - The storm alert details.
 * @param {string | string[]} data.email - Recipient's email address.
 * @param {string} data.cycloneName - Name of the cyclone.
 * @param {string} data.cycloneTime - The reference date of the cyclone in ISO format.
 * @param {ActivatedTriggers | undefined} [data.activatedTriggers] - Object containing details of activated triggers.
 * @param {string[]} [data.activatedTriggers.districts48kt] - List of districts affected by winds over 48kt.
 * @param {string[]} [data.activatedTriggers.districts64kt] - List of districts affected by winds over 64kt.
 * @param {string} data.redirectUrl - URL to access the anticipatory action storm map.
 * @param {string} data.base64Image - Base64-encoded image of the storm.
 * @param {WindState | undefined} data.status - Wind state of the storm.
 *
 * @returns {Promise<void>} - Resolves when the email is sent.
 */

export const sendStormAlertEmail = async (
  data: StormAlertData,
): Promise<void> => {
  if (!data.status || data.status === WindState.monitoring) {
    throw new Error('No triggers or readiness activated');
  }

  let alertTitle = '';
  let readiness = false;
  const windspeed =
    data.status === WindState.activated_64kt ||
    data.status === WindState.activated_48kt
      ? displayWindState[data.status]
      : null;

  if (windspeed) {
    alertTitle = `Activation Triggers detected for windspeed ${windspeed} for ${data.cycloneName}`;
  } else if (data.status === WindState.ready) {
    readiness = true;
    alertTitle = `Readiness Triggers detected for ${data.cycloneName}`;
  } else {
    throw new Error('No windspeed found');
  }

  const emailData: StormAlertEmail = {
    alertTitle,
    cycloneName: data.cycloneName,
    cycloneTime: data.cycloneTime,
    activatedTriggers:
      data.activatedTriggers && windspeed
        ? {
            ...data.activatedTriggers,
            districts48kt: data.activatedTriggers.districts48kt?.length
              ? data.activatedTriggers.districts48kt.join(', ')
              : '',
            districts64kt: data.activatedTriggers.districts64kt?.length
              ? data.activatedTriggers.districts64kt.join(', ')
              : '',
            windspeed: windspeed || '',
          }
        : undefined,
    redirectUrl: data.redirectUrl,
    unsubscribeUrl: '',
    readiness,
  };

  const mailOptions = {
    from: 'wfp.prism@wfp.org',
    to: '',
    bcc: data.email,
    subject: alertTitle,
    html: '',
    text: '',
    attachments: [
      {
        filename: 'map-icon.png',
        path: path.join(__dirname, '../images/mapIcon.png'),
        cid: 'map-icon',
      },
      {
        filename: 'arrow-forward-icon.png',
        path: path.join(__dirname, '../images/arrowForwardIcon.png'),
        cid: 'arrow-forward-icon',
      },
      {
        filename: 'storm-image.png',
        content: data.base64Image,
        encoding: 'base64',
        cid: 'storm-image-cid',
      },
    ],
  };

  try {
    const [htmlOutput, textOutput] = await Promise.all([
      ejs.renderFile(path.join(__dirname, '../templates', 'storm-alert.ejs'), {
        ...emailData,
        isPlainText: false,
      }),
      ejs.renderFile(path.join(__dirname, '../templates', 'storm-alert.ejs'), {
        ...emailData,
        isPlainText: true,
      }),
    ]);

    mailOptions.html = htmlOutput;
    mailOptions.text = textOutput;
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending storm alert email:', error);
    throw error;
  }
};

export const sendFloodAlertEmail = async (
  data: FloodAlertEmailData,
): Promise<void> => {
  const alertTitle = data.title;
  const mailOptions = {
    from: 'wfp.prism@wfp.org',
    to: '',
    bcc: data.email,
    subject: alertTitle,
    html: '',
    text: '',
    attachments: [
      {
        filename: 'map-icon.png',
        path: path.join(__dirname, '../images/mapIcon.png'),
        cid: 'map-icon',
      },
      {
        filename: 'arrow-forward-icon.png',
        path: path.join(__dirname, '../images/arrowForwardIcon.png'),
        cid: 'arrow-forward-icon',
      },
      {
        filename: 'flood-image.png',
        content: data.base64Image,
        encoding: 'base64',
        cid: 'flood-image-cid',
      },
    ],
  };

  try {
    const [htmlOutput, textOutput] = await Promise.all([
      ejs.renderFile(path.join(__dirname, '../templates', 'flood-alert.ejs'), {
        ...data,
        isPlainText: false,
      }),
      ejs.renderFile(path.join(__dirname, '../templates', 'flood-alert.ejs'), {
        ...data,
        isPlainText: true,
      }),
    ]);

    mailOptions.html = htmlOutput;
    mailOptions.text = textOutput;
    await sendEmail(mailOptions);
  } catch (error) {
    console.error('Error sending flood alert email:', error);
    throw error;
  }
};

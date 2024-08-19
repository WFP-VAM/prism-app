import nodemailer from 'nodemailer';

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

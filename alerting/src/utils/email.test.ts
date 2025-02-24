import { sendEmail } from './email';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('sendEmail', () => {
  let sendMailMock: jest.Mock;

  beforeAll(() => {
    sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: 'test-response',
    });

    nodemailer.createTransport = jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send an email using provided credentials', async () => {
    process.env.PRISM_ALERTS_EMAIL_PASSWORD = 'test-password';
    process.env.PRISM_ALERTS_EMAIL_USER = 'test-user';
    process.env.PRISM_ALERTS_EMAIL_HOST = 'test-host';

    await sendEmail({
      from: 'wfp.prism@wfp.org',
      to: 'eric@ovio.org',
      subject: 'Test Subject',
      text: 'Test text body',
      html: '<b>Test HTML body</b>',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'test-host',
      port: 465,
      secure: true,
      auth: {
        user: 'test-user',
        pass: 'test-password',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'wfp.prism@wfp.org',
      to: 'eric@ovio.org',
      subject: 'Test Subject',
      text: 'Test text body',
      html: '<b>Test HTML body</b>',
    });
  });

  it('should send an email using ethereal account if no credentials are provided', async () => {
    process.env.PRISM_ALERTS_EMAIL_PASSWORD = '';
    process.env.PRISM_ALERTS_EMAIL_USER = '';

    const testAccount = {
      user: 'ethereal-user',
      pass: 'ethereal-pass',
    };

    nodemailer.createTestAccount = jest.fn().mockResolvedValue(testAccount);

    await sendEmail({
      from: 'test@example.com',
      to: 'eric@ovio.org',
      subject: 'Test Subject',
      text: 'Test text body',
      html: '<b>Test HTML body</b>',
    });

    expect(nodemailer.createTestAccount).toHaveBeenCalled();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal-user',
        pass: 'ethereal-pass',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'test@example.com',
      to: 'eric@ovio.org',
      subject: 'Test Subject',
      text: 'Test text body',
      html: '<b>Test HTML body</b>',
    });
  });
});

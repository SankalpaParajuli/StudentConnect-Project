const nodemailer = require('nodemailer');

let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} catch (error) {
  console.warn('SMTP not configured, email service will log messages instead:', error.message);
  transporter = null;
}

const getEmailTemplate = (type, data) => {
  const baseColor = '#4F7C82';
  const accentColor = '#B8E3E9';
  const darkColor = '#0B2E33';

  const templates = {
    verification: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${baseColor}, ${accentColor}); padding: 30px; color: white; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .message { font-size: 16px; color: #333; line-height: 1.6; }
            .highlight { color: ${baseColor}; font-weight: bold; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
            .button { display: inline-block; background: ${baseColor}; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to StudentConnect!</h1>
            </div>
            <div class="content">
              <p class="message">Hi <span class="highlight">${data.name}</span>,</p>
              <p class="message">Thank you for registering on StudentConnect! Your account has been created successfully and is pending admin approval.</p>
              <p class="message">Once approved by our administrators, you'll be able to:</p>
              <ul class="message">
                <li>Connect with fellow students</li>
                <li>Share and access study resources</li>
                <li>Create and join study rooms</li>
                <li>Request tutoring sessions</li>
              </ul>
              <p class="message">We'll notify you as soon as your account is approved. Thank you for being part of our community!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 StudentConnect. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    approval: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${baseColor}, ${accentColor}); padding: 30px; color: white; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .message { font-size: 16px; color: #333; line-height: 1.6; }
            .highlight { color: ${baseColor}; font-weight: bold; }
            .success { color: #27ae60; font-weight: bold; font-size: 18px; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
            .button { display: inline-block; background: ${baseColor}; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Approved! 🎉</h1>
            </div>
            <div class="content">
              <p class="message">Hi <span class="highlight">${data.name}</span>,</p>
              <p class="success">Your StudentConnect account has been approved!</p>
              <p class="message">You now have full access to the platform. Start connecting with classmates, sharing resources, and growing your learning network.</p>
              <p class="message">Ready to get started? Log in and explore:</p>
              <ul class="message">
                <li>Find study partners and make friends</li>
                <li>Share your notes and resources</li>
                <li>Join study rooms</li>
                <li>Connect with tutors</li>
              </ul>
              <a href="${process.env.CLIENT_URL}" class="button">Go to StudentConnect</a>
              <p class="message">Welcome to our community!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 StudentConnect. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    passwordReset: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, ${darkColor}, ${baseColor}); padding: 30px; color: white; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .message { font-size: 16px; color: #333; line-height: 1.6; }
            .code { background: #f0f0f0; padding: 15px; border-left: 4px solid ${baseColor}; font-family: monospace; font-size: 18px; font-weight: bold; color: ${baseColor}; margin: 20px 0; text-align: center; }
            .warning { color: #e74c3c; font-size: 14px; margin: 15px 0; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p class="message">Hi ${data.name},</p>
              <p class="message">You requested to reset your password. Use the code below to create a new password:</p>
              <div class="code">${data.resetToken}</div>
              <p class="warning">⚠️ This code will expire in 1 hour. Do not share it with anyone.</p>
              <p class="message">If you didn't request this reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 StudentConnect. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  return templates[type] || '';
};

const sendVerificationEmail = async (email, name) => {
  try {
    if (!transporter) {
      console.warn(`SMTP not configured. Would send verification email to ${email} for ${name}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to StudentConnect - Account Created',
      html: getEmailTemplate('verification', { name }),
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error.message);
  }
};

const sendApprovalEmail = async (email, name) => {
  try {
    if (!transporter) {
      console.warn(`SMTP not configured. Would send approval email to ${email} for ${name}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your StudentConnect Account Has Been Approved!',
      html: getEmailTemplate('approval', { name }),
    });
    console.log(`Approval email sent to ${email}`);
  } catch (error) {
    console.error('Error sending approval email:', error.message);
  }
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    if (!transporter) {
      console.warn(`SMTP not configured. Would send password reset email to ${email} with token: ${resetToken}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Password Reset Request - StudentConnect',
      html: getEmailTemplate('passwordReset', { name, resetToken }),
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
  }
};

module.exports = {
  sendVerificationEmail,
  sendApprovalEmail,
  sendPasswordResetEmail,
};

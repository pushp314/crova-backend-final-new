const nodemailer = require('nodemailer');

// Create transporter - FIXED: Changed from createTransporter to createTransport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email verification
const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
          <p>Thank you for signing up! Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (email, order) => {
  try {
    const transporter = createTransporter();

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Order Confirmation - #${order.id}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
          <p>Thank you for your order! Here are the details:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">Order #${order.id}</h3>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          <h3>Items Ordered:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            We'll send you another email when your order ships. Thank you for shopping with us!
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    const firstName = name.split(' ')[0];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Crova — Where Every Stitch is a Statement ✨',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Hey ${firstName},</h2>
          
          <h3 style="color: #333;">Welcome to Crova! 💫</h3>
          
          <p>You’ve just stepped into a world where clothing isn’t just worn — it’s felt.</p>
          
          <p>At Crova, every stitch, shade, and fabric is crafted to reflect you — your vibe, your story, your confidence.</p>
          
          <p>Here’s what you can do next:</p>
          
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 15px;">
              <strong>👗 Explore:</strong> Discover uniquely embroidered and custom-made pieces.
            </li>
            <li style="margin-bottom: 15px;">
              <strong>🎨 Personalize:</strong> Design your own style — because trends fade, but you are timeless.
            </li>
            <li style="margin-bottom: 15px;">
              <strong>📦 Shop:</strong> Start your journey with our latest drops and limited editions.
            </li>
          </ul>

          <div style="margin: 30px 0; text-align: center;">
             <a href="https://www.crova.in" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Shopping</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you didn’t create this account, please ignore this email.</p>
          
          <p style="margin-top: 30px;">
            Welcome to the Crova family,<br>
            <strong>Team Crova</strong>
          </p>
          
          <p style="font-style: italic; color: #888;">
            ✨ Custom. Crafted. Crova.<br>
            <a href="https://www.crova.in" style="color: #666; text-decoration: none;">www.crova.in</a>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error to avoid failing registration if email fails
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail
};
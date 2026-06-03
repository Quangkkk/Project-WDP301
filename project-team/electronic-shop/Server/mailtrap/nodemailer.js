require('dotenv').config(); // Load environment variables from .env file

const nodemailer = require('nodemailer');

const  sendMail = async ({ email, subject, html }) => {
  try {
    // Create a transporter using the SMTP configuration
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Gmail service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER, // Send from the admin email address
      to: email, // Recipient's email address
      subject: subject, // Email subject
      html: html // HTML content of the email
    };

    // Send the email
    let info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId); // Log the message ID
  } catch (error) {
    console.error('Error sending email: %s', error); // Log the error
  }
};

module.exports = sendMail;

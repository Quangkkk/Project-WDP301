const nodemailer = require("nodemailer");

const sendVerificationEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Electronic Shop" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your Electronic Shop account",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  });
};

module.exports = {
  sendVerificationEmail,
};
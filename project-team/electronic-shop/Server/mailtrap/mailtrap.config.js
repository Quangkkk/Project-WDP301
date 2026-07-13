const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const hasGmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = hasGmailConfig
  ? nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

const sender = {
  name: process.env.FROM_NAME || "Online Tech Shop",
  address:
    process.env.FROM_EMAIL ||
    process.env.EMAIL_USER ||
    "no-reply@onlinetechshop.local",
};

module.exports = {
  transporter,
  sender,
};
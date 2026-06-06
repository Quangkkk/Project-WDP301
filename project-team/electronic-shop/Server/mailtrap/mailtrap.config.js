const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Create a transporter using SMTP
exports.transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  secure: false,
  auth: null,
});

// Default sender details
exports.sender = {
  email: process.env.FROM_EMAIL,
  name: process.env.FROM_NAME,
};

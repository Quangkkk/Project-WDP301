const { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } = require("./emailTemplates.js");
const { transporter, sender } = require("./mailtrap.config.js");

// Send verification email
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    console.log("co vao day 1", sender);
    console.log("co vao day 2", email);

    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        verificationToken
      ),
    });

    console.log("Verification email sent:", response.messageId);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Error sending verification email");
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Welcome to Our Service!",
      html: `<p>Hello ${name}, welcome to our service!</p>`,
    });

    console.log("Welcome email sent:", response.messageId);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Error sending welcome email");
  }
};

// Send forgot password email
const sendForgotPasswordEmail = async (email, resetURL) => {
  try {
    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Password Reset Request",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
    });

    console.log("Password reset request email sent:", response.messageId);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Error sending password reset email");
  }
};

// Send password reset success email
const sendResetSuccessEmail = async (email) => {
  try {
    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    });

    console.log("Password reset success email sent:", response.messageId);
  } catch (error) {
    console.error("Error sending password reset success email:", error);
    throw new Error("Error sending password reset success email");
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendResetSuccessEmail,
};

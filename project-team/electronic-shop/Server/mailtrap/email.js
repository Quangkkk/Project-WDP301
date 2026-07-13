const {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
} = require("./emailTemplates.js");
const { transporter, sender } = require("./mailtrap.config.js");

const sendVerificationEmail = async (email, verificationToken) => {
  const response = await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Xác thực tài khoản",
    html: VERIFICATION_EMAIL_TEMPLATE.replace(
      "{verificationCode}",
      verificationToken
    ),
  });

  console.log("Verification email sent:", response.messageId);
};

const sendWelcomeEmail = async (email, name) => {
  const response = await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Chào mừng đến với Online Tech Shop",
    html: `<p>Xin chào ${name}, chào mừng bạn đến với Online Tech Shop.</p>`,
  });

  console.log("Welcome email sent:", response.messageId);
};

const sendForgotPasswordEmail = async (email, resetURL) => {
  const response = await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Đặt lại mật khẩu",
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
  });

  console.log("Password reset request email sent:", response.messageId);
};

const sendResetSuccessEmail = async (email) => {
  const response = await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Mật khẩu đã được đặt lại",
    html: PASSWORD_RESET_SUCCESS_TEMPLATE,
  });

  console.log("Password reset success email sent:", response.messageId);
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendResetSuccessEmail,
};
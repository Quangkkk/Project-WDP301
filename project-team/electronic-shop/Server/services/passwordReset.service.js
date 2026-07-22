const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User.model");
const {
  transporter,
  sender,
} = require("../mailtrap/mailtrap.config");

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const hashValue = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");

const createError = (
  message,
  statusCode,
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const findUser = async (email) => {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    throw createError(
      "Vui lòng nhập email",
      400,
    );
  }

  if (
    !/^\S+@\S+\.\S+$/.test(
      normalizedEmail,
    )
  ) {
    throw createError(
      "Email không hợp lệ",
      400,
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw createError(
      "Email không tồn tại",
      404,
    );
  }

  if (user.status === "blocked") {
    throw createError(
      "Tài khoản đã bị khóa",
      403,
    );
  }

  return user;
};

const sendOtpMail = async (
  user,
  otp,
) => {
  return transporter.sendMail({
    from: sender,
    to: user.email,
    subject:
      "Mã OTP đặt lại mật khẩu - TechSale",
    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          color: #1f2937;
        "
      >
        <div
          style="
            background: #f97316;
            padding: 20px;
            text-align: center;
            border-radius: 14px 14px 0 0;
          "
        >
          <h1 style="margin: 0; color: white;">
            Đặt lại mật khẩu
          </h1>
        </div>

        <div
          style="
            background: #fff7ed;
            padding: 24px;
            border-radius: 0 0 14px 14px;
          "
        >
          <p>
            Xin chào
            <b>${user.name || "bạn"}</b>,
          </p>

          <p>
            Mã OTP để đặt lại mật khẩu
            của bạn là:
          </p>

          <div
            style="
              text-align: center;
              margin: 28px 0;
            "
          >
            <span
              style="
                display: inline-block;
                background: white;
                border: 2px dashed #fb923c;
                border-radius: 12px;
                padding: 16px 24px;
                font-size: 36px;
                font-weight: 800;
                letter-spacing: 8px;
                color: #ea580c;
              "
            >
              ${otp}
            </span>
          </div>

          <p>
            Mã có hiệu lực trong
            <b>10 phút</b>.
          </p>

          <p>
            Không chia sẻ mã này với
            bất kỳ ai.
          </p>

          <p>
            Nếu bạn không yêu cầu đặt
            lại mật khẩu, hãy bỏ qua email này.
          </p>
        </div>
      </div>
    `,
  });
};

const requestOtp = async (email) => {
  const user = await findUser(email);

  const otp = crypto
    .randomInt(
      100000,
      1000000,
    )
    .toString();

  user.reset_password_token =
    hashValue(otp);

  user.reset_password_expires =
    new Date(
      Date.now() +
        OTP_TTL_MS,
    );

  await user.save();

  try {
    await sendOtpMail(
      user,
      otp,
    );
  } catch (error) {
    /*
     * Không giữ OTP hợp lệ nếu
     * email không gửi được.
     */
    user.reset_password_token =
      null;

    user.reset_password_expires =
      null;

    await user.save();

    throw createError(
      `Không gửi được OTP qua Gmail: ${error.message}`,
      500,
    );
  }

  return {
    email: user.email,
    expires_in: Math.floor(
      OTP_TTL_MS / 1000,
    ),
  };
};

const verifyOtp = async ({
  email,
  otp,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedOtp =
    String(otp || "").trim();

  if (
    !normalizedEmail ||
    !/^\d{6}$/.test(
      normalizedOtp,
    )
  ) {
    throw createError(
      "Mã OTP phải gồm 6 chữ số",
      400,
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,

    reset_password_token:
      hashValue(normalizedOtp),

    reset_password_expires: {
      $gt: new Date(),
    },
  });

  if (!user) {
    throw createError(
      "Mã OTP không đúng hoặc đã hết hạn",
      400,
    );
  }

  /*
   * OTP đúng thì tạo reset token mới.
   * Frontend cần token này để đổi mật khẩu.
   */
  const resetToken =
    crypto
      .randomBytes(32)
      .toString("hex");

  user.reset_password_token =
    hashValue(resetToken);

  user.reset_password_expires =
    new Date(
      Date.now() +
        RESET_TOKEN_TTL_MS,
    );

  await user.save();

  return {
    email: user.email,
    reset_token: resetToken,

    expires_in: Math.floor(
      RESET_TOKEN_TTL_MS /
        1000,
    ),
  };
};

const changePassword = async ({
  email,
  resetToken,
  password,
  confirmPassword,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  if (
    !normalizedEmail ||
    !resetToken
  ) {
    throw createError(
      "Phiên đặt lại mật khẩu không hợp lệ",
      400,
    );
  }

  if (
    !password ||
    !confirmPassword
  ) {
    throw createError(
      "Vui lòng nhập mật khẩu mới và xác nhận mật khẩu",
      400,
    );
  }

  if (
    String(password).length <
    6
  ) {
    throw createError(
      "Mật khẩu phải có ít nhất 6 ký tự",
      400,
    );
  }

  if (
    password !==
    confirmPassword
  ) {
    throw createError(
      "Mật khẩu xác nhận không khớp",
      400,
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,

    reset_password_token:
      hashValue(resetToken),

    reset_password_expires: {
      $gt: new Date(),
    },
  });

  if (!user) {
    throw createError(
      "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
      400,
    );
  }

  user.hash_pass =
    await bcrypt.hash(
      password,
      10,
    );

  user.reset_password_token =
    null;

  user.reset_password_expires =
    null;

  await user.save();

  try {
    await transporter.sendMail({
      from: sender,
      to: user.email,
      subject:
        "Mật khẩu đã được đặt lại - TechSale",
      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
          "
        >
          <h2 style="color: #16a34a;">
            Đặt lại mật khẩu thành công
          </h2>

          <p>
            Mật khẩu tài khoản TechSale
            của bạn đã được thay đổi.
          </p>

          <p>
            Nếu bạn không thực hiện
            thao tác này, hãy liên hệ
            hỗ trợ ngay.
          </p>
        </div>
      `,
    });
  } catch (error) {
    /*
     * Mật khẩu vẫn đổi thành công
     * dù email thông báo gửi thất bại.
     */
    console.error(
      "Send reset password success email failed:",
      error.message,
    );
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  changePassword,
};
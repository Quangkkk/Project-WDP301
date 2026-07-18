const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");

const safeSelect = "-hash_pass -email_otp -email_otp_expires -reset_password_token -reset_password_expires -__v";

// Tao JWT token cho user
// parameters: user (object), role (object)
// return: JWT token string
const buildToken = (user, role) => {
  return jwt.sign(
    {
      user_id: user._id,
      role_id: user.role_id,
      role: role?.code ? role.code.toUpperCase() : undefined,
    },
    process.env.JWT_SECRET || "dev_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// Lay hoac tao mac dinh role customer
// return: Role document
const getCustomerRole = async () => {
  let role = await Role.findOne({ code: { $regex: /^customer$/i } });
  if (!role) {
    role = await Role.create({
      code: "customer",
      name: "Customer",
      description: "Default customer role",
    });
  }
  return role;
};

// Dang ky tai khoan moi
// parameters: name, email, password, phone, img_url
// return: User object duoc populate role
const register = async ({ name, email, password, phone, img_url }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Kiem tra email da ton tai chua
  const existedUser = await User.findOne({ email: normalizedEmail });
  if (existedUser) {
    throw new Error("Email already exists");
  }

  // Lay role customer mac dinh
  const role = await getCustomerRole();

  // Hash mat khau voi bcrypt
  const hash_pass = await bcrypt.hash(password, 10);

  // Sinh OTP xac thuc
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phut

  // Tao user moi
  const user = await User.create({
    role_id: role._id,
    name,
    email: normalizedEmail,
    hash_pass,
    phone: phone || null,
    img_url: img_url || null,
    status: "unverified",
    email_otp: otp,
    email_otp_expires: otpExpires,
  });

  // Gui mail OTP xac thuc tai khoan bang Nodemailer
  const sendMail = require("../mailtrap/nodemailer");
  await sendMail({
    email: normalizedEmail,
    subject: "Xac nhan dang ky tai khoan - Electronic Shop",
    html: `<p>Xin chao <b>${name}</b>,</p>
           <p>Cam on ban da dang ky tai khoan tai Electronic Shop. Ma xac thuc OTP cua ban la:</p>
           <h2 style="color: #007bff; letter-spacing: 2px;">${otp}</h2>
           <p>Ma OTP nay co hieu luc trong 5 phut. Vui long khong chia se ma nay voi bat ky ai.</p>`,
  });

  // Lay lai thong tin user de tra ve (loai bo mat khau)
  return await User.findById(user._id)
    .select(safeSelect)
    .populate("role_id", "name code");
};

// Dang nhap tai khoan
// parameters: email, password
// return: { token, data: User object }
const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Tim user theo email va populate role
  const user = await User.findOne({ email: normalizedEmail }).populate(
    "role_id",
    "name code"
  );

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // So sanh mat khau hash
  const isMatch = await bcrypt.compare(password, user.hash_pass);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // Kiem tra trang thai tai khoan
  if (user.status === "blocked") {
    throw new Error("Account has been blocked");
  }
  if (user.status === "unverified") {
    throw new Error("Account has not been verified");
  }

  // Tao token
  const token = buildToken(user, user.role_id);

  // Lay thong tin user an toan de tra ve
  const data = await User.findById(user._id)
    .select(safeSelect)
    .populate("role_id", "name code");

  return { token, data };
};

// Xac thuc email bang ma OTP
// parameters: { email, otp }
// return: User object sau khi update status
const verifyEmail = async ({ email, otp }) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === "active") {
    return user;
  }

  // Kiem tra hop le hoac het han cua OTP
  if (user.email_otp !== otp || new Date(user.email_otp_expires).getTime() < Date.now()) {
    throw new Error("Invalid or expired OTP code");
  }

  user.status = "active";
  user.email_otp = null;
  user.email_otp_expires = null;
  await user.save();

  return await User.findById(user._id)
    .select(safeSelect)
    .populate("role_id", "name code");
};

// Gui lai ma xac nhan OTP qua email
// parameters: email
// return: string message
const resendVerificationCode = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === "active") {
    return "Account is already active";
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email_otp = otp;
  user.email_otp_expires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  const sendMail = require("../mailtrap/nodemailer");
  await sendMail({
    email: user.email,
    subject: "Gui lai ma xac thuc OTP - Electronic Shop",
    html: `<p>Xin chao <b>${user.name}</b>,</p>
           <p>Day la ma xac thuc OTP moi cua ban de hoan tat dang ky:</p>
           <h2 style="color: #007bff; letter-spacing: 2px;">${otp}</h2>
           <p>Ma OTP nay co hieu luc trong 5 phut.</p>`,
  });

  return "OTP resent successfully";
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationCode,
  buildToken,
};

const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Xác thực tài khoản</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 620px; margin: 0 auto; padding: 24px;">
  <div style="background: #f97316; padding: 20px; border-radius: 14px 14px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0;">Xác thực tài khoản</h1>
  </div>

  <div style="background: #fff7ed; padding: 24px; border-radius: 0 0 14px 14px;">
    <p>Xin chào,</p>
    <p>Mã xác thực tài khoản của bạn là:</p>

    <div style="text-align: center; margin: 28px 0;">
      <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #ea580c;">
        {verificationCode}
      </span>
    </div>

    <p>Mã này sẽ hết hạn sau một thời gian ngắn vì lý do bảo mật.</p>
    <p>Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
  </div>
</body>
</html>
`;

const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Đặt lại mật khẩu</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 620px; margin: 0 auto; padding: 24px;">
  <div style="background: #f97316; padding: 20px; border-radius: 14px 14px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0;">Đặt lại mật khẩu</h1>
  </div>

  <div style="background: #fff7ed; padding: 24px; border-radius: 0 0 14px 14px;">
    <p>Xin chào,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
    <p>Bấm nút bên dưới để tạo mật khẩu mới:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background: #f97316; color: white; padding: 13px 22px; text-decoration: none; border-radius: 999px; font-weight: 700;">
        Đặt lại mật khẩu
      </a>
    </div>

    <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
  </div>
</body>
</html>
`;

const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Đặt lại mật khẩu thành công</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 620px; margin: 0 auto; padding: 24px;">
  <div style="background: #16a34a; padding: 20px; border-radius: 14px 14px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0;">Mật khẩu đã được đặt lại</h1>
  </div>

  <div style="background: #f0fdf4; padding: 24px; border-radius: 0 0 14px 14px;">
    <p>Xin chào,</p>
    <p>Mật khẩu của bạn đã được đặt lại thành công.</p>
    <p>Nếu bạn không thực hiện thao tác này, vui lòng liên hệ hỗ trợ ngay.</p>
  </div>
</body>
</html>
`;

module.exports = {
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
};
import api from './api'

export const login = async ({
  email,
  password,
}) => {
  const response =
    await api.post(
      '/auth/login',
      {
        email,
        password,
      },
    )

  return response.data
}

export const register = async ({
  name,
  email,
  password,
  phone,
}) => {
  const response =
    await api.post(
      '/auth/register',
      {
        name,
        email,
        password,
        phone,
      },
    )

  return response.data
}

export const forgotPassword =
  async ({ email }) => {
    const response =
      await api.post(
        '/auth/forgot-password',
        {
          email,
        },
      )

    return response.data
  }

export const verifyResetOtp =
  async ({
    email,
    otp,
  }) => {
    const response =
      await api.post(
        '/auth/verify-reset-otp',
        {
          email,
          otp,
        },
      )

    return response.data
  }

export const resendResetOtp =
  async ({ email }) => {
    const response =
      await api.post(
        '/auth/resend-reset-otp',
        {
          email,
        },
      )

    return response.data
  }

export const resetPassword =
  async ({
    email,
    resetToken,
    password,
    confirmPassword,
  }) => {
    const response =
      await api.post(
        '/auth/reset-password',
        {
          email,

          reset_token:
            resetToken,

          resetToken,

          password,

          confirm_password:
            confirmPassword,

          confirmPassword,
        },
      )

    return response.data
  }

export const verifyEmail =
  async ({
    email,
    otp,
  }) => {
    const response =
      await api.post(
        '/auth/verify-email',
        {
          email,
          otp,
        },
      )

    return response.data
  }

export const resendOTP =
  async ({ email }) => {
    const response =
      await api.post(
        '/auth/resend-otp',
        {
          email,
        },
      )

    return response.data
  }

export const resendVerificationCode =
  async ({ email }) => {
    const response =
      await api.post(
        '/auth/resend-verification-code',
        {
          email,
        },
      )

    return response.data
  }
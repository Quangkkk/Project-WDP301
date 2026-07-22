import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Container from 'react-bootstrap/Container'

import {
  Link,
} from 'react-router-dom'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'

import AuthPanel from '../../components/organisms/AuthPanel'
import MainLayout from '../../components/templates/MainLayout'

import {
  getErrorMessage,
} from '../../services/api'

import {
  forgotPassword,
  resendResetOtp,
  resetPassword,
  verifyResetOtp,
} from '../../services/auth.service'

const content = {
  email: {
    title: 'Quên mật khẩu',

    subtitle:
      'Nhập email đã đăng ký để nhận mã OTP qua Gmail.',
  },

  otp: {
    title: 'Xác thực OTP',

    subtitle:
      'Nhập mã OTP 6 chữ số đã được gửi tới Gmail của bạn.',
  },

  password: {
    title:
      'Tạo mật khẩu mới',

    subtitle:
      'OTP hợp lệ. Hãy đặt mật khẩu mới cho tài khoản.',
  },

  success: {
    title:
      'Đặt lại thành công',

    subtitle:
      'Bạn có thể đăng nhập bằng mật khẩu mới.',
  },
}

function ForgotPasswordPage() {
  const [
    step,
    setStep,
  ] = useState('email')

  const [
    form,
    setForm,
  ] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  })

  const [
    resetToken,
    setResetToken,
  ] = useState('')

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({})

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    countdown,
    setCountdown,
  ] = useState(0)

  useEffect(() => {
    if (
      step !== 'otp' ||
      countdown <= 0
    ) {
      return undefined
    }

    const timer =
      window.setTimeout(
        () => {
          setCountdown(
            (value) =>
              Math.max(
                0,
                value - 1,
              ),
          )
        },
        1000,
      )

    return () =>
      window.clearTimeout(
        timer,
      )
  }, [
    step,
    countdown,
  ])

  const updateField = (
    name,
    value,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [name]: value,
      }),
    )

    setFieldErrors(
      (current) => ({
        ...current,
        [name]: '',
      }),
    )

    setError('')
    setMessage('')
  }

  const normalizedEmail =
    form.email
      .trim()
      .toLowerCase()

  const disabled =
    useMemo(() => {
      if (loading) {
        return true
      }

      if (
        step === 'email'
      ) {
        return !normalizedEmail
      }

      if (
        step === 'otp'
      ) {
        return (
          form.otp.length !==
          6
        )
      }

      if (
        step ===
        'password'
      ) {
        return (
          !form.password ||
          !form.confirmPassword ||
          !resetToken
        )
      }

      return false
    }, [
      loading,
      step,
      normalizedEmail,
      form,
      resetToken,
    ])

  const sendOtp = async (
    event,
  ) => {
    event.preventDefault()

    if (!normalizedEmail) {
      setFieldErrors({
        email:
          'Vui lòng nhập email.',
      })

      return
    }

    if (
      !/^\S+@\S+\.\S+$/.test(
        normalizedEmail,
      )
    ) {
      setFieldErrors({
        email:
          'Email không hợp lệ.',
      })

      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response =
        await forgotPassword(
          {
            email:
              normalizedEmail,
          },
        )

      setForm(
        (current) => ({
          ...current,

          email:
            normalizedEmail,

          otp: '',
        }),
      )

      setCountdown(60)
      setStep('otp')

      setMessage(
        response?.message ||
          'Mã OTP đã được gửi tới Gmail.',
      )
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,

          'Không gửi được mã OTP.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp =
    async (event) => {
      event.preventDefault()

      if (
        !/^\d{6}$/.test(
          form.otp,
        )
      ) {
        setFieldErrors({
          otp:
            'Mã OTP phải gồm 6 chữ số.',
        })

        return
      }

      try {
        setLoading(true)
        setError('')
        setMessage('')

        const response =
          await verifyResetOtp(
            {
              email:
                normalizedEmail,

              otp:
                form.otp,
            },
          )

        const token =
          response?.data
            ?.reset_token ||
          response
            ?.reset_token

        if (!token) {
          throw new Error(
            'API không trả về reset token.',
          )
        }

        setResetToken(
          token,
        )

        setStep(
          'password',
        )

        setMessage(
          response?.message ||
            'Xác thực OTP thành công.',
        )
      } catch (
        verifyError
      ) {
        setError(
          getErrorMessage(
            verifyError,

            'Không xác thực được OTP.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const resendOtp =
    async () => {
      if (
        loading ||
        countdown > 0
      ) {
        return
      }

      try {
        setLoading(true)
        setError('')
        setMessage('')

        const response =
          await resendResetOtp(
            {
              email:
                normalizedEmail,
            },
          )

        setForm(
          (current) => ({
            ...current,
            otp: '',
          }),
        )

        setCountdown(60)

        setMessage(
          response?.message ||
            'Đã gửi lại mã OTP.',
        )
      } catch (
        resendError
      ) {
        setError(
          getErrorMessage(
            resendError,

            'Không gửi lại được OTP.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const submitNewPassword =
    async (event) => {
      event.preventDefault()

      const nextErrors = {}

      if (!form.password) {
        nextErrors.password =
          'Vui lòng nhập mật khẩu mới.'
      } else if (
        form.password.length <
        6
      ) {
        nextErrors.password =
          'Mật khẩu phải có ít nhất 6 ký tự.'
      }

      if (
        !form.confirmPassword
      ) {
        nextErrors.confirmPassword =
          'Vui lòng xác nhận mật khẩu.'
      } else if (
        form.password !==
        form.confirmPassword
      ) {
        nextErrors.confirmPassword =
          'Mật khẩu xác nhận không khớp.'
      }

      if (
        Object.keys(
          nextErrors,
        ).length > 0
      ) {
        setFieldErrors(
          nextErrors,
        )

        return
      }

      try {
        setLoading(true)
        setError('')
        setMessage('')

        const response =
          await resetPassword(
            {
              email:
                normalizedEmail,

              resetToken,

              password:
                form.password,

              confirmPassword:
                form.confirmPassword,
            },
          )

        setStep(
          'success',
        )

        setResetToken('')

        setMessage(
          response?.message ||
            'Đặt lại mật khẩu thành công.',
        )
      } catch (
        resetError
      ) {
        setError(
          getErrorMessage(
            resetError,

            'Không đặt lại được mật khẩu.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }

  const backToEmail = () => {
    setStep('email')

    setForm(
      (current) => ({
        ...current,
        otp: '',
        password: '',
        confirmPassword: '',
      }),
    )

    setResetToken('')
    setCountdown(0)
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container className='max-w-xl'>
          <AuthPanel
            title={
              content[step]
                .title
            }
            subtitle={
              content[step]
                .subtitle
            }
          >
            <div className='mb-5 grid grid-cols-3 gap-2'>
              {[
                'Nhập email',
                'Xác thực',
                'Đổi mật khẩu',
              ].map(
                (
                  label,
                  index,
                ) => {
                  const active =
                    step ===
                    'email'
                      ? 0
                      : step ===
                          'otp'
                        ? 1
                        : 2

                  return (
                    <div
                      key={
                        label
                      }
                      className={`!rounded-lg px-2 py-2 text-center text-xs font-bold ${
                        index <=
                        active
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {index +
                        1}
                      . {label}
                    </div>
                  )
                },
              )}
            </div>

            <div className='mb-4 d-flex flex-column gap-3'>
              <Alert type='danger'>
                {error}
              </Alert>

              <Alert type='success'>
                {message}
              </Alert>
            </div>

            {step ===
              'email' && (
              <form
                onSubmit={
                  sendOtp
                }
                noValidate
              >
                <TextField
                  label='Email đã đăng ký'
                  id='email'
                  type='email'
                  autoComplete='email'
                  placeholder='customer@example.com'
                  value={
                    form.email
                  }
                  error={
                    fieldErrors.email
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      'email',

                      event
                        .target
                        .value,
                    )
                  }
                  className='mb-5'
                />

                <Button
                  type='submit'
                  className='w-100 py-3'
                  isLoading={
                    loading
                  }
                  disabled={
                    disabled
                  }
                >
                  Gửi mã OTP
                </Button>
              </form>
            )}

            {step ===
              'otp' && (
              <form
                onSubmit={
                  verifyOtp
                }
                noValidate
              >
                <p className='mb-4 !rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-600'>
                  OTP đã được
                  gửi đến{' '}
                  <b>
                    {
                      normalizedEmail
                    }
                  </b>
                </p>

                <TextField
                  label='Mã OTP'
                  id='otp'
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  maxLength={6}
                  placeholder='000000'
                  value={
                    form.otp
                  }
                  error={
                    fieldErrors.otp
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      'otp',

                      event
                        .target
                        .value
                        .replace(
                          /\D/g,
                          '',
                        )
                        .slice(
                          0,
                          6,
                        ),
                    )
                  }
                  className='mb-5'
                />

                <Button
                  type='submit'
                  className='w-100 py-3'
                  isLoading={
                    loading
                  }
                  disabled={
                    disabled
                  }
                >
                  Xác thực OTP
                </Button>

                <div className='mt-4 d-flex flex-column gap-3 text-center text-sm'>
                  <button
                    type='button'
                    onClick={
                      resendOtp
                    }
                    disabled={
                      countdown >
                        0 ||
                      loading
                    }
                    className='border-0 bg-transparent font-bold text-orange-600 disabled:text-slate-400'
                  >
                    {countdown >
                    0
                      ? `Gửi lại OTP sau ${countdown}s`
                      : 'Gửi lại mã OTP'}
                  </button>

                  <button
                    type='button'
                    onClick={
                      backToEmail
                    }
                    className='border-0 bg-transparent font-bold text-slate-500'
                  >
                    Đổi email khác
                  </button>
                </div>
              </form>
            )}

            {step ===
              'password' && (
              <form
                onSubmit={
                  submitNewPassword
                }
                noValidate
              >
                <TextField
                  label='Mật khẩu mới'
                  id='password'
                  type='password'
                  autoComplete='new-password'
                  value={
                    form.password
                  }
                  error={
                    fieldErrors.password
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      'password',

                      event
                        .target
                        .value,
                    )
                  }
                  className='mb-4'
                />

                <TextField
                  label='Xác nhận mật khẩu'
                  id='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  value={
                    form.confirmPassword
                  }
                  error={
                    fieldErrors
                      .confirmPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      'confirmPassword',

                      event
                        .target
                        .value,
                    )
                  }
                  className='mb-5'
                />

                <Button
                  type='submit'
                  className='w-100 py-3'
                  isLoading={
                    loading
                  }
                  disabled={
                    disabled
                  }
                >
                  Đặt lại mật khẩu
                </Button>
              </form>
            )}

            {step ===
              'success' && (
              <Button
                as={Link}
                to='/login'
                className='w-100 py-3'
              >
                Quay lại đăng nhập
              </Button>
            )}

            {step !==
              'success' && (
              <p className='mt-5 mb-0 text-center text-sm text-slate-500'>
                Đã nhớ mật khẩu?{' '}

                <Link
                  to='/login'
                  className='font-bold text-orange-600'
                >
                  Quay lại đăng nhập
                </Link>
              </p>
            )}
          </AuthPanel>
        </Container>
      </section>
    </MainLayout>
  )
}

export default ForgotPasswordPage
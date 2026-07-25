import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import AuthTextField from '../../components/atoms/AuthTextField'
import AuthPanel from '../../components/organisms/AuthPanel'
import AuthLayout from '../../components/templates/AuthLayout'
import { getErrorMessage } from '../../services/api'
import {
  forgotPassword,
  resendResetOtp,
  resetPassword,
  verifyResetOtp,
} from '../../services/auth.service'

const STEP_CONTENT = {
  email: {
    title: 'Quên mật khẩu?',
    subtitle: 'Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.',
  },
  otp: {
    title: 'Xác thực OTP',
    subtitle: 'Nhập mã OTP gồm 6 chữ số đã được gửi đến email của bạn.',
  },
  password: {
    title: 'Tạo mật khẩu mới',
    subtitle: 'Đặt mật khẩu mới có ít nhất 6 ký tự cho tài khoản.',
  },
  success: {
    title: 'Đổi mật khẩu thành công',
    subtitle: 'Bạn có thể đăng nhập lại bằng mật khẩu mới ngay bây giờ.',
  },
}

const STEP_LABELS = ['Nhập email', 'Xác thực OTP', 'Mật khẩu mới']

function getActiveStep(step) {
  if (step === 'email') return 0
  if (step === 'otp') return 1
  return 2
}

function ForgotPasswordPage() {
  const [step, setStep] = useState('email')
  const [form, setForm] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  })
  const [resetToken, setResetToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [step, countdown])

  const normalizedEmail = form.email.trim().toLowerCase()
  const activeStep = getActiveStep(step)

  const disabled = useMemo(() => {
    if (loading) return true
    if (step === 'email') return !normalizedEmail
    if (step === 'otp') return form.otp.length !== 6
    if (step === 'password') {
      return !form.password || !form.confirmPassword || !resetToken
    }
    return false
  }, [form, loading, normalizedEmail, resetToken, step])

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setFieldErrors((current) => ({
      ...current,
      [name]: '',
    }))
    setError('')
    setMessage('')
  }

  const sendOtp = async (event) => {
    event.preventDefault()

    if (!normalizedEmail) {
      setFieldErrors({ email: 'Vui lòng nhập email.' })
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFieldErrors({ email: 'Email không hợp lệ.' })
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await forgotPassword({ email: normalizedEmail })

      setForm((current) => ({
        ...current,
        email: normalizedEmail,
        otp: '',
      }))
      setCountdown(60)
      setStep('otp')
      setMessage(response?.message || 'Mã OTP đã được gửi tới email của bạn.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không gửi được mã OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()

    if (!/^\d{6}$/.test(form.otp)) {
      setFieldErrors({ otp: 'Mã OTP phải gồm 6 chữ số.' })
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await verifyResetOtp({
        email: normalizedEmail,
        otp: form.otp,
      })

      const token = response?.data?.reset_token || response?.reset_token

      if (!token) {
        throw new Error('API không trả về reset token.')
      }

      setResetToken(token)
      setStep('password')
      setMessage(response?.message || 'Xác thực OTP thành công.')
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, 'Không xác thực được OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (loading || countdown > 0) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await resendResetOtp({ email: normalizedEmail })

      setForm((current) => ({
        ...current,
        otp: '',
      }))
      setCountdown(60)
      setMessage(response?.message || 'Đã gửi lại mã OTP.')
    } catch (resendError) {
      setError(getErrorMessage(resendError, 'Không gửi lại được OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const submitNewPassword = async (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!form.password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu mới.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await resetPassword({
        email: normalizedEmail,
        resetToken,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })

      setStep('success')
      setResetToken('')
      setMessage(response?.message || 'Đặt lại mật khẩu thành công.')
    } catch (resetError) {
      setError(getErrorMessage(resetError, 'Không đặt lại được mật khẩu.'))
    } finally {
      setLoading(false)
    }
  }

  const backToEmail = () => {
    setStep('email')
    setForm((current) => ({
      ...current,
      otp: '',
      password: '',
      confirmPassword: '',
    }))
    setResetToken('')
    setCountdown(0)
    setFieldErrors({})
    setError('')
    setMessage('')
  }

  return (
    <AuthLayout>
      <AuthPanel
        title={STEP_CONTENT[step].title}
        subtitle={STEP_CONTENT[step].subtitle}
        eyebrow='Khôi phục tài khoản'
        asideTitle={step === 'success' ? 'Tài khoản đã sẵn sàng!' : 'Bảo vệ tài khoản của bạn'}
        asideDescription={
          step === 'success'
            ? 'Mật khẩu đã được cập nhật. Hãy quay lại đăng nhập và tiếp tục mua sắm tại TechSale.'
            : 'TechSale sử dụng OTP gửi qua email để xác minh đúng chủ tài khoản trước khi đổi mật khẩu.'
        }
        asideActionLabel='Quay lại đăng nhập'
        asideActionTo='/login'
      >
        <div className='mb-6 grid grid-cols-3 gap-2'>
          {STEP_LABELS.map((label, index) => {
            const isCompleted = index < activeStep || step === 'success'
            const isActive = index === activeStep && step !== 'success'

            return (
              <div key={label} className='text-center'>
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className='h-4 w-4' /> : index + 1}
                </div>
                <p
                  className={`mt-2 text-[11px] font-bold sm:text-xs ${
                    isCompleted || isActive ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </p>
              </div>
            )
          })}
        </div>

        {error && (
          <div className='mb-4'>
            <Alert type='danger'>{error}</Alert>
          </div>
        )}

        {message && step !== 'success' && (
          <div className='mb-4'>
            <Alert type='success'>{message}</Alert>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={sendOtp} noValidate>
            <AuthTextField
              label='Email đã đăng ký'
              id='email'
              type='email'
              autoComplete='email'
              placeholder='customer@example.com'
              value={form.email}
              error={fieldErrors.email}
              onChange={(event) => updateField('email', event.target.value)}
              icon={Mail}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-5'
            />

            <Button
              type='submit'
              variant='warning'
              className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
              isLoading={loading}
              disabled={disabled}
            >
              Gửi mã OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} noValidate>
            <div className='mb-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center'>
              <Mail className='mx-auto mb-2 h-6 w-6 text-orange-600' />
              <p className='text-sm text-slate-600'>OTP đã được gửi đến</p>
              <p className='mt-1 break-all text-sm font-extrabold text-slate-900'>
                {normalizedEmail}
              </p>
            </div>

            <AuthTextField
              label='Mã OTP'
              id='otp'
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={6}
              placeholder='000000'
              value={form.otp}
              error={fieldErrors.otp}
              onChange={(event) =>
                updateField(
                  'otp',
                  event.target.value.replace(/\D/g, '').slice(0, 6),
                )
              }
              icon={KeyRound}
              inputClassName='!rounded-xl bg-slate-50 py-4 text-center text-lg font-black tracking-[0.35em] focus:bg-white'
              className='mb-5'
            />

            <Button
              type='submit'
              variant='warning'
              className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
              isLoading={loading}
              disabled={disabled}
            >
              Xác thực OTP
            </Button>

            <div className='mt-5 flex flex-col items-center gap-3 text-sm'>
              <button
                type='button'
                onClick={resendOtp}
                disabled={countdown > 0 || loading}
                className='font-extrabold text-orange-600 transition hover:text-orange-700 disabled:text-slate-400'
              >
                {countdown > 0
                  ? `Gửi lại OTP sau ${countdown}s`
                  : 'Gửi lại mã OTP'}
              </button>

              <button
                type='button'
                onClick={backToEmail}
                className='font-bold text-slate-500 transition hover:text-slate-800'
              >
                Sử dụng email khác
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitNewPassword} noValidate>
            <AuthTextField
              label='Mật khẩu mới'
              id='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              placeholder='Tối thiểu 6 ký tự'
              value={form.password}
              error={fieldErrors.password}
              onChange={(event) => updateField('password', event.target.value)}
              icon={LockKeyhole}
              endAdornment={(
                <button
                  type='button'
                  onClick={() => setShowPassword((current) => !current)}
                  className='rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              )}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-4'
            />

            <AuthTextField
              label='Xác nhận mật khẩu'
              id='confirmPassword'
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete='new-password'
              placeholder='Nhập lại mật khẩu mới'
              value={form.confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(event) =>
                updateField('confirmPassword', event.target.value)
              }
              icon={LockKeyhole}
              endAdornment={(
                <button
                  type='button'
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  className='rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
                  aria-label={
                    showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              )}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-5'
            />

            <Button
              type='submit'
              variant='warning'
              className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
              isLoading={loading}
              disabled={disabled}
            >
              Đặt lại mật khẩu
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className='text-center'>
            <div className='mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100'>
              <CheckCircle2 className='h-10 w-10 text-green-600' />
            </div>

            <Alert type='success' className='mb-5 text-left'>
              {message || 'Đặt lại mật khẩu thành công.'}
            </Alert>

            <Button
              as={Link}
              to='/login'
              variant='warning'
              className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
            >
              Đăng nhập bằng mật khẩu mới
            </Button>
          </div>
        )}

        {step !== 'success' && (
          <p className='mt-6 text-center text-sm text-slate-500 lg:hidden'>
            Đã nhớ mật khẩu?{' '}
            <Link to='/login' className='font-extrabold text-orange-600'>
              Quay lại đăng nhập
            </Link>
          </p>
        )}
      </AuthPanel>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
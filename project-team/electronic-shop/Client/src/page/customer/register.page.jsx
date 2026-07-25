import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import AuthTextField from '../../components/atoms/AuthTextField'
import AuthPanel from '../../components/organisms/AuthPanel'
import AuthLayout from '../../components/templates/AuthLayout'
import { getErrorMessage } from '../../services/api'
import { register, resendOTP, verifyEmail } from '../../services/auth.service'

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isRegisterDisabled = useMemo(
    () =>
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword ||
      isLoading,
    [form, isLoading],
  )

  const isOtpDisabled = useMemo(
    () => otp.length !== 6 || isLoading,
    [otp, isLoading],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }))
    setMessage('')
    setSuccess('')
  }

  const validate = () => {
    const nextErrors = {}
    const normalizedEmail = form.email.trim()
    const normalizedPhone = form.phone.trim()

    if (!form.name.trim()) {
      nextErrors.name = 'Vui lòng nhập họ tên'
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Vui lòng nhập email'
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      nextErrors.email = 'Email không hợp lệ'
    }

    if (normalizedPhone && !/^(?:0\d{9}|\+84\d{9})$/.test(normalizedPhone)) {
      nextErrors.phone = 'Số điện thoại không hợp lệ'
    }

    if (form.password.length < 6) {
      nextErrors.password = 'Mật khẩu tối thiểu 6 ký tự'
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu nhập lại không khớp'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    if (isLoading || !validate()) {
      return
    }

    try {
      setIsLoading(true)

      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      })

      setIsOtpSent(true)
      setOtp('')
      setSuccess(
        'Tạo tài khoản thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.',
      )
      setMessage('')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Đăng ký thất bại.'))
      setSuccess('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (event) => {
    event.preventDefault()

    if (!/^\d{6}$/.test(otp)) {
      setErrors((previous) => ({
        ...previous,
        otp: 'Mã OTP phải gồm 6 chữ số',
      }))
      return
    }

    try {
      setIsLoading(true)

      await verifyEmail({
        email: form.email.trim().toLowerCase(),
        otp,
      })

      setSuccess('Xác thực tài khoản thành công. Đang chuyển đến trang đăng nhập...')
      setMessage('')
      window.setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Xác thực OTP thất bại.'))
      setSuccess('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (isLoading) {
      return
    }

    try {
      setIsLoading(true)

      await resendOTP({
        email: form.email.trim().toLowerCase(),
      })

      setOtp('')
      setSuccess('Mã OTP mới đã được gửi đến email của bạn.')
      setMessage('')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gửi lại OTP thất bại.'))
      setSuccess('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthPanel
        formPosition='right'
        title={isOtpSent ? 'Xác thực email' : 'Tạo tài khoản'}
        subtitle={
          isOtpSent
            ? 'Nhập mã OTP gồm 6 chữ số đã được gửi đến email đăng ký.'
            : ''
        }
        eyebrow={isOtpSent ? 'Bảo mật tài khoản' : 'Thành viên mới'}
        asideTitle={isOtpSent ? 'Chỉ còn một bước!' : 'Rất vui được gặp bạn!'}
        asideDescription={
          isOtpSent
            ? 'Xác thực email giúp bảo vệ tài khoản và đảm bảo bạn nhận được thông tin đơn hàng chính xác.'
            : 'Tạo tài khoản miễn phí để có trải nghiệm mua sắm thuận tiện hơn tại TechSale.'
        }
        asideActionLabel='Đăng nhập'
        asideActionTo='/login'
        formClassName={!isOtpSent ? 'lg:py-10' : ''}
      >
        {message && (
          <div className='mb-4'>
            <Alert type='danger'>{message}</Alert>
          </div>
        )}

        {success && (
          <div className='mb-4'>
            <Alert type='success'>{success}</Alert>
          </div>
        )}

        {!isOtpSent ? (
          <form onSubmit={handleRegister} noValidate>
            <AuthTextField
              label='Họ và tên'
              id='name'
              name='name'
              autoComplete='name'
              placeholder='Nguyễn Văn A'
              value={form.name}
              error={errors.name}
              onChange={handleChange}
              icon={UserRound}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-3.5'
            />

            <AuthTextField
              label='Email'
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              placeholder='customer@example.com'
              value={form.email}
              error={errors.email}
              onChange={handleChange}
              icon={Mail}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-3.5'
            />

            <AuthTextField
              label='Số điện thoại (không bắt buộc)'
              id='phone'
              name='phone'
              type='tel'
              inputMode='tel'
              autoComplete='tel'
              placeholder='0901234567'
              value={form.phone}
              error={errors.phone}
              onChange={handleChange}
              icon={Phone}
              inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
              className='mb-3.5'
            />

            <AuthTextField
              label='Mật khẩu'
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              placeholder='Tối thiểu 6 ký tự'
              value={form.password}
              error={errors.password}
              onChange={handleChange}
              icon={LockKeyhole}
              endAdornment={(
                <button
                  type='button'
                  onClick={() => setShowPassword((current) => !current)}
                  className='rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className='h-5 w-5' />
                  ) : (
                    <Eye className='h-5 w-5' />
                  )}
                </button>
              )}
              className='mb-3.5'
            />

            <AuthTextField
              label='Xác nhận mật khẩu'
              id='confirmPassword'
              name='confirmPassword'
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete='new-password'
              placeholder='Nhập lại mật khẩu'
              value={form.confirmPassword}
              error={errors.confirmPassword}
              onChange={handleChange}
              icon={ShieldCheck}
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
                    <EyeOff className='h-5 w-5' />
                  ) : (
                    <Eye className='h-5 w-5' />
                  )}
                </button>
              )}
              className='mb-3.5'
            />

            <Button
              type='submit'
              variant='warning'
              className='w-full rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
              isLoading={isLoading}
              disabled={isRegisterDisabled}
            >
              Tạo tài khoản
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} noValidate>
            <div className='mb-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center'>
              <Mail className='mx-auto mb-2 h-6 w-6 text-orange-600' />
              <p className='text-sm text-slate-600'>Mã xác thực đã được gửi đến</p>
              <p className='mt-1 break-all text-sm font-extrabold text-slate-900'>
                {form.email.trim().toLowerCase()}
              </p>
            </div>

            <AuthTextField
              label='Mã OTP'
              id='otp'
              name='otp'
              inputMode='numeric'
              autoComplete='one-time-code'
              placeholder='000000'
              maxLength={6}
              value={otp}
              error={errors.otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                setErrors((previous) => ({ ...previous, otp: '' }))
                setMessage('')
              }}
              icon={KeyRound}
              inputClassName='!rounded-xl bg-slate-50 py-4 text-center text-lg font-black tracking-[0.35em] focus:bg-white'
              className='mb-5'
            />

            <Button
              type='submit'
              variant='warning'
              className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
              isLoading={isLoading}
              disabled={isOtpDisabled}
            >
              Xác thực tài khoản
            </Button>

            <div className='mt-5 text-center text-sm text-slate-500'>
              Chưa nhận được mã?{' '}
              <button
                type='button'
                className='font-extrabold text-orange-600 transition hover:text-orange-700 disabled:opacity-50'
                onClick={handleResendOTP}
                disabled={isLoading}
              >
                Gửi lại OTP
              </button>
            </div>
          </form>
        )}

      </AuthPanel>
    </AuthLayout>
  )
}

export default RegisterPage
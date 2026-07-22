import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPanel from '../../components/organisms/AuthPanel'
import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { register, verifyEmail, resendOTP } from '../../services/auth.service'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isRegisterDisabled = useMemo(() => !form.name || !form.email || !form.password || !form.confirmPassword || isLoading, [form, isLoading])
  const isOtpDisabled = useMemo(() => !otp || isLoading || otp.length < 6, [otp, isLoading])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setMessage('')
    setSuccess('')
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ tên'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Email không hợp lệ'
    if (form.password.length < 6) next.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Mật khẩu nhập lại không khớp'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    if (!validate()) return
    try {
      setIsLoading(true)
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
      setIsOtpSent(true)
      setSuccess('Tạo tài khoản thành công! Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.')
      setMessage('')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Đăng ký thất bại'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (event) => {
    event.preventDefault()
    if (!otp) return
    try {
      setIsLoading(true)
      await verifyEmail({ email: form.email.trim(), otp: otp.trim() })
      setSuccess('Xác thực tài khoản thành công! Đang chuyển hướng...')
      setMessage('')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Xác thực OTP thất bại'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      setIsLoading(true)
      await resendOTP({ email: form.email.trim() })
      setSuccess('Mã OTP đã được gửi lại vào email của bạn.')
      setMessage('')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gửi lại OTP thất bại'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <section className='py-12 md:py-20'>
        <div className='container mx-auto px-4 max-w-xl'>
          <AuthPanel 
            title={isOtpSent ? 'Xác Thực Email' : 'Tạo Tài Khoản'} 
            subtitle={isOtpSent ? 'Nhập mã OTP đã được gửi đến email của bạn.' : 'Tạo tài khoản customer để theo dõi đơn hàng và lưu lịch sử mua sắm.'}
          >
            {message && <div className="mb-6"><Alert type='danger'>{message}</Alert></div>}
            {success && <div className="mb-6"><Alert type='success'>{success}</Alert></div>}
            
            {!isOtpSent ? (
              <form onSubmit={handleRegister}>
                <TextField label='Họ và tên' id='name' name='name' value={form.name} error={errors.name} onChange={handleChange} className='mb-4' />
                <TextField label='Email' id='email' name='email' type='email' placeholder='customer@example.com' value={form.email} error={errors.email} onChange={handleChange} className='mb-4' />
                <TextField label='Số điện thoại' id='phone' name='phone' value={form.phone} onChange={handleChange} className='mb-4' />
                
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                  <TextField label='Mật khẩu' id='password' name='password' type='password' value={form.password} error={errors.password} onChange={handleChange} />
                  <TextField label='Xác nhận mật khẩu' id='confirmPassword' name='confirmPassword' type='password' value={form.confirmPassword} error={errors.confirmPassword} onChange={handleChange} />
                </div>
                
                <Button type='submit' className='w-full py-3 text-lg' isLoading={isLoading} disabled={isRegisterDisabled}>
                  Đăng Ký
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <TextField 
                  label='Mã OTP (6 số)' 
                  id='otp' 
                  name='otp' 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className='mb-6' 
                  placeholder='VD: 123456' 
                  maxLength={6} 
                />
                
                <Button type='submit' className='w-full py-3 text-lg mb-6' isLoading={isLoading} disabled={isOtpDisabled}>
                  Xác Thực Tài Khoản
                </Button>
                
                <div className='text-center'>
                  <span className='text-sm text-slate-500'>Chưa nhận được mã? </span>
                  <button 
                    type='button' 
                    className='text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none disabled:opacity-50' 
                    onClick={handleResendOTP} 
                    disabled={isLoading}
                  >
                    Gửi lại OTP
                  </button>
                </div>
              </form>
            )}

            {!isOtpSent && (
              <p className='mt-8 text-center text-slate-500'>
                Bạn đã có tài khoản?{' '}
                <Link to='/login' className='font-bold text-blue-600 hover:text-blue-700 transition-colors'>
                  Đăng nhập
                </Link>
              </p>
            )}
          </AuthPanel>
        </div>
      </section>
    </MainLayout>
  )
}

export default RegisterPage

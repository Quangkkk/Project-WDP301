import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import AuthTextField from '../../components/atoms/AuthTextField'
import AuthPanel from '../../components/organisms/AuthPanel'
import AuthLayout from '../../components/templates/AuthLayout'

import { getErrorMessage } from '../../services/api'
import { login } from '../../services/auth.service'
import { getUserRole, saveAuth } from '../../utils/authStorage'

const BACK_OFFICE_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
const AUTH_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

function normalizeInternalPath(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const path = value.trim()

  if (!path.startsWith('/') || path.startsWith('//')) {
    return ''
  }

  return path
}

function getPathname(path) {
  return path.split(/[?#]/, 1)[0] || '/'
}

function isAuthPath(path) {
  const pathname = getPathname(path)

  return AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isBackOfficePath(path) {
  const pathname = getPathname(path)

  return ['/admin', '/manager', '/staff'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function getCustomerRedirectPath(value) {
  const path = normalizeInternalPath(value)

  if (!path || isAuthPath(path) || isBackOfficePath(path)) {
    return '/'
  }

  return path
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isDisabled = useMemo(
    () => !form.email.trim() || !form.password.trim() || isLoading,
    [form, isLoading],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))

    setMessage('')
  }

  const validate = () => {
    const nextErrors = {}
    const email = form.email.trim()

    if (!email) {
      nextErrors.email = 'Vui lòng nhập email'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Email không hợp lệ'
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Vui lòng nhập mật khẩu'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isLoading || !validate()) {
      return
    }

    try {
      setIsLoading(true)
      setMessage('')

      const response = await login({
        email: form.email.trim(),
        password: form.password,
      })

      const token =
        response?.accessToken ||
        response?.access_token ||
        response?.token ||
        response?.data?.accessToken ||
        response?.data?.access_token ||
        response?.data?.token

      const user = response?.user || response?.data?.user || response?.data

      if (!token || !user || typeof user !== 'object') {
        throw new Error('Phản hồi đăng nhập thiếu token hoặc thông tin người dùng.')
      }

      saveAuth({ token, user })

      const role = getUserRole(user)

      if (BACK_OFFICE_ROLES.includes(role)) {
        const destination =
          role === 'STAFF'
            ? '/staff'
            : role === 'MANAGER'
              ? '/manager'
              : '/admin'

        navigate(destination, { replace: true })
        return
      }

      if (role === 'CUSTOMER') {
        const redirectPath = getCustomerRedirectPath(location.state?.from)
        navigate(redirectPath, { replace: true })
        return
      }

      navigate('/', { replace: true })
    } catch (error) {
      setMessage(getErrorMessage(error, 'Đăng nhập thất bại.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthPanel
        title='Đăng nhập'asideTitle='Chào mừng trở lại!'
        asideDescription='Tiếp tục hành trình mua sắm công nghệ với sản phẩm chính hãng, thanh toán linh hoạt và hỗ trợ nhanh chóng.'
        asideActionLabel='Tạo tài khoản'
        asideActionTo='/register'
      >
        {message && (
          <div className='mb-5'>
            <Alert type='danger'>{message}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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
            className='mb-4'
          />

          <AuthTextField
            label='Mật khẩu'
            id='password'
            name='password'
            type={showPassword ? 'text' : 'password'}
            autoComplete='current-password'
            placeholder='Nhập mật khẩu'
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
            inputClassName='!rounded-xl bg-slate-50 py-3.5 focus:bg-white'
            className='mb-4'
          />

          <div className='mb-6 flex flex-wrap items-center justify-between gap-3 text-sm'>
            <label className='flex cursor-pointer items-center gap-2 text-slate-600'>
              <input
                type='checkbox'
                className='h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500'
              />
              <span className='font-semibold'>Ghi nhớ tài khoản</span>
            </label>

            <Link
              to='/forgot-password'
              className='font-extrabold text-orange-600 transition hover:text-orange-700'
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type='submit'
            variant='warning'
            className='w-full !rounded-full py-3.5 text-base shadow-lg shadow-orange-200'
            isLoading={isLoading}
            disabled={isDisabled}
          >
            Đăng nhập
          </Button>
        </form>

        <p className='mt-6 text-center text-sm text-slate-500 lg:hidden'>
          Bạn chưa có tài khoản?{' '}
          <Link to='/register' className='font-extrabold text-orange-600'>
            Đăng ký ngay
          </Link>
        </p>
      </AuthPanel>
    </AuthLayout>
  )
}

export default LoginPage
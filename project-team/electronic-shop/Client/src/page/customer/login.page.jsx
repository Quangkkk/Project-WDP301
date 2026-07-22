import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import AuthPanel from '../../components/organisms/AuthPanel'
import MainLayout from '../../components/templates/MainLayout'

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
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
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

      const user =
        response?.user ||
        response?.data?.user ||
        response?.data

      if (!token || !user || typeof user !== 'object') {
        throw new Error('Phản hồi đăng nhập thiếu token hoặc thông tin người dùng.')
      }

      saveAuth({ token, user })

      const role = getUserRole(user)

      // Các role quản trị luôn vào dashboard, không quay lại trang public trước đó.
      if (BACK_OFFICE_ROLES.includes(role)) {
        const dest = role === 'STAFF' ? '/staff' : role === 'MANAGER' ? '/manager' : '/admin'
        navigate(dest, { replace: true })
        return
      }

      // CUSTOMER quay lại đúng trang đã đứng trước khi mở trang đăng nhập.
      if (role === 'CUSTOMER') {
        const redirectPath = getCustomerRedirectPath(location.state?.from)
        navigate(redirectPath, { replace: true })
        return
      }

      // Role không xác định không được tự chuyển vào trang quản trị.
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(getErrorMessage(error, 'Đăng nhập thất bại.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <section className='py-12 md:py-20'>
        <div className='container mx-auto max-w-lg px-4'>
          <AuthPanel
            title='Đăng nhập'
            subtitle='Chào mừng trở lại. Đăng nhập để tiếp tục mua sắm.'
          >
            {message && (
              <div className='mb-6'>
                <Alert type='danger'>{message}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                label='Email'
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                placeholder='customer@example.com'
                value={form.email}
                error={errors.email}
                onChange={handleChange}
                className='mb-5'
              />

              <TextField
                label='Mật khẩu'
                id='password'
                name='password'
                type='password'
                autoComplete='current-password'
                placeholder='••••••••'
                value={form.password}
                error={errors.password}
                onChange={handleChange}
                className='mb-5'
              />

              <div className='mb-8 flex items-center justify-between text-sm'>
                <label className='flex cursor-pointer items-center gap-2 text-slate-600'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 !rounded border-slate-300 text-orange-600 focus:ring-orange-500'
                  />
                  <span className='font-medium'>Ghi nhớ tài khoản</span>
                </label>

                <Link
                  to='/forgot-password'
                  className='font-bold text-orange-600 transition-colors hover:text-orange-700'
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                type='submit'
                className='w-full py-3 text-lg'
                isLoading={isLoading}
                disabled={isDisabled}
              >
                Đăng nhập
              </Button>
            </form>

            <p className='mt-8 text-center text-slate-500'>
              Bạn chưa có tài khoản?{' '}
              <Link
                to='/register'
                className='font-bold text-orange-600 transition-colors hover:text-orange-700'
              >
                Đăng ký ngay
              </Link>
            </p>
          </AuthPanel>
        </div>
      </section>
    </MainLayout>
  )
}

export default LoginPage
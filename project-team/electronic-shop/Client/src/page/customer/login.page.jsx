import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthPanel from '../../components/organisms/AuthPanel'
import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import { login } from '../../services/auth.service'
import { getErrorMessage } from '../../services/api'
import { getUserRole, saveAuth } from '../../utils/authStorage'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.from || ''

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isDisabled = useMemo(
    () => !form.email.trim() || !form.password.trim() || isLoading,
    [form, isLoading],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setMessage('')
  }

  const validate = () => {
    const next = {}

    if (!form.email.trim()) next.email = 'Vui lòng nhập email'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Email không hợp lệ'

    if (!form.password.trim()) next.password = 'Vui lòng nhập mật khẩu'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    try {
      setIsLoading(true)
      const response = await login({
        email: form.email.trim(),
        password: form.password,
      })

      const token = response?.accessToken || response?.token
      const user = response?.data

      if (!token || !user) {
        throw new Error('Phản hồi đăng nhập thiếu token hoặc thông tin người dùng.')
      }

      saveAuth({ token, user })

      const role = getUserRole(user)
      const fallbackPath = ['ADMIN', 'MANAGER', 'STAFF'].includes(role)
        ? '/admin'
        : '/'

      navigate(redirectPath || fallbackPath, { replace: true })
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

            <form onSubmit={handleSubmit}>
              <TextField
                label='Email'
                id='email'
                name='email'
                type='email'
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

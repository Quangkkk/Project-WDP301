import { useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
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

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isDisabled = useMemo(() => {
    return !form.email.trim() || !form.password.trim() || isLoading
  }, [form, isLoading])

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
    const next = {}

    if (!form.email.trim()) {
      next.email = 'Vui lòng nhập email'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = 'Email không hợp lệ'
    }

    if (!form.password.trim()) {
      next.password = 'Vui lòng nhập mật khẩu'
    }

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
      <section className='page-section'>
        <Container className='max-w-xl'>
          <AuthPanel
            title='Đăng nhập'
            subtitle='Đăng nhập để mua hàng và quản lý đơn hàng của bạn.'
          >
            <Alert type='danger'>{message}</Alert>

            <Form onSubmit={handleSubmit}>
              <TextField
                label='Email'
                id='email'
                name='email'
                type='email'
                placeholder='customer@example.com'
                value={form.email}
                error={errors.email}
                onChange={handleChange}
                className='mb-3'
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
                className='mb-3'
              />

              <div className='mb-4 d-flex justify-content-between gap-3 text-sm'>
                <label className='d-flex align-items-center gap-2 text-slate-600'>
                  <input type='checkbox' /> Ghi nhớ đăng nhập
                </label>

                <Link
                  to='/forgot-password'
                  className='font-bold text-orange-600 text-decoration-none hover:text-orange-700'
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                type='submit'
                className='w-100 py-3'
                isLoading={isLoading}
                disabled={isDisabled}
              >
                Đăng nhập
              </Button>
            </Form>

            <p className='mt-4 mb-0 text-center text-sm text-slate-500'>
              Chưa có tài khoản?{' '}
              <Link to='/register' className='font-bold text-orange-600'>
                Đăng ký ngay
              </Link>
            </p>
          </AuthPanel>
        </Container>
      </section>
    </MainLayout>
  )
}

export default LoginPage
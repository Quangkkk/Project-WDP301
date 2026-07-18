import { useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import { Link, useNavigate, useParams } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import AuthPanel from '../../components/organisms/AuthPanel'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'

import { resetPassword } from '../../services/auth.service'
import { getErrorMessage } from '../../services/api'

function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const isDisabled = useMemo(() => {
    return (
      !form.password.trim() ||
      !form.confirmPassword.trim() ||
      isLoading ||
      isSuccess
    )
  }, [form, isLoading, isSuccess])

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

    setError('')
    setMessage('')
  }

  const validate = () => {
    const next = {}

    if (!form.password.trim()) {
      next.password = 'Vui lòng nhập mật khẩu mới.'
    } else if (form.password.length < 6) {
      next.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
    }

    if (!form.confirmPassword.trim()) {
      next.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) return

    try {
      setIsLoading(true)
      setError('')
      setMessage('')

      const response = await resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })

      setIsSuccess(true)
      setMessage(
        response?.message ||
          'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
      )
    } catch (error) {
      setError(getErrorMessage(error, 'Không đặt lại được mật khẩu.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container className='max-w-xl'>
          <AuthPanel
            title='Đặt lại mật khẩu'
            subtitle='Tạo mật khẩu mới cho tài khoản của bạn.'
          >
            <Alert type='danger'>{error}</Alert>
            <Alert type='success'>{message}</Alert>

            <Form onSubmit={handleSubmit}>
              <TextField
                label='Mật khẩu mới'
                id='password'
                name='password'
                type='password'
                placeholder='Nhập mật khẩu mới'
                value={form.password}
                error={errors.password}
                onChange={handleChange}
                className='mb-3'
              />

              <TextField
                label='Xác nhận mật khẩu'
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                placeholder='Nhập lại mật khẩu mới'
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={handleChange}
                className='mb-4'
              />

              <Button
                type='submit'
                className='w-100 py-3'
                isLoading={isLoading}
                disabled={isDisabled}
              >
                Đặt lại mật khẩu
              </Button>
            </Form>

            <div className='mt-4 d-flex flex-column gap-2 text-center text-sm'>
              {isSuccess && (
                <button
                  type='button'
                  onClick={() => navigate('/login')}
                  className='border-0 bg-transparent font-bold text-orange-600'
                >
                  Đăng nhập ngay
                </button>
              )}

              <Link to='/login' className='font-bold text-slate-500'>
                Quay lại đăng nhập
              </Link>
            </div>
          </AuthPanel>
        </Container>
      </section>
    </MainLayout>
  )
}

export default ResetPasswordPage
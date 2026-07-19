import { useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import { Link } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import AuthPanel from '../../components/organisms/AuthPanel'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'

import { forgotPassword } from '../../services/auth.service'
import { getErrorMessage } from '../../services/api'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isDisabled = useMemo(() => {
    return !email.trim() || isLoading
  }, [email, isLoading])

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setMessage('')
    setResetUrl('')

    if (!email.trim()) {
      setError('Vui lòng nhập email.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Email không hợp lệ.')
      return
    }

    try {
      setIsLoading(true)

      const response = await forgotPassword({
        email: email.trim(),
      })

      setMessage(
        response?.message ||
          'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
      )

      const devResetUrl = response?.data?.reset_url

      if (devResetUrl) {
        setResetUrl(devResetUrl)
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Không gửi được yêu cầu đặt lại mật khẩu.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container className='max-w-xl'>
          <AuthPanel
            title='Quên mật khẩu'
            subtitle='Nhập email tài khoản của bạn để nhận liên kết đặt lại mật khẩu.'
          >
            <Alert type='danger'>{error}</Alert>
            <Alert type='success'>{message}</Alert>

            {resetUrl && (
              <div className='mb-3 !rounded-4 border border-orange-100 bg-orange-50 p-3 text-sm text-orange-700'>
                <p className='mb-2 font-bold'>
                  Link reset dùng khi chạy local:
                </p>

                <a
                  href={resetUrl}
                  className='break-all font-bold text-orange-700'
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <Form onSubmit={handleSubmit}>
              <TextField
                label='Email'
                id='email'
                name='email'
                type='email'
                placeholder='customer@example.com'
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                  setMessage('')
                  setResetUrl('')
                }}
                className='mb-4'
              />

              <Button
                type='submit'
                className='w-100 py-3'
                isLoading={isLoading}
                disabled={isDisabled}
              >
                Gửi liên kết đặt lại mật khẩu
              </Button>
            </Form>

            <p className='mt-4 mb-0 text-center text-sm text-slate-500'>
              Đã nhớ mật khẩu?{' '}
              <Link to='/login' className='font-bold text-orange-600'>
                Quay lại đăng nhập
              </Link>
            </p>
          </AuthPanel>
        </Container>
      </section>
    </MainLayout>
  )
}

export default ForgotPasswordPage
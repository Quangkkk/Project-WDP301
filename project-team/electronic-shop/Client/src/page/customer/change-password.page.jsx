import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import TextField from '../../components/atoms/TextField'

import { getErrorMessage } from '../../services/api'
import { changePassword } from '../../services/user.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'

const initialForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

function PasswordHint({ valid, children }) {
  return (
    <div
      className={`d-flex align-items-center gap-2 text-sm font-bold ${
        valid ? 'text-emerald-600' : 'text-slate-400'
      }`}
    >
      <i className={`bi ${valid ? 'bi-check-circle-fill' : 'bi-circle'}`} />
      {children}
    </div>
  )
}

function ChangePasswordPage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const currentUserId = getUserId(currentUser)

  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isLengthValid = form.new_password.length >= 8
  const isConfirmValid =
    form.confirm_password.length > 0 &&
    form.new_password === form.confirm_password
  const isDifferent =
    form.current_password &&
    form.new_password &&
    form.current_password !== form.new_password

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setError('')
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!currentUserId) {
      setError('Bạn cần đăng nhập để đổi mật khẩu.')
      return
    }

    if (!form.current_password.trim()) {
      setError('Vui lòng nhập mật khẩu hiện tại.')
      return
    }

    if (!form.new_password.trim()) {
      setError('Vui lòng nhập mật khẩu mới.')
      return
    }

    if (form.new_password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (form.new_password !== form.confirm_password) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    if (form.current_password === form.new_password) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      await changePassword(currentUserId, {
        current_password: form.current_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      })

      setForm(initialForm)
      setMessage('Đổi mật khẩu thành công.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không đổi được mật khẩu.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <section className='bg-orange-50/40 py-5'>
        <Container>
          <div className='mb-4 d-flex flex-wrap align-items-end justify-content-between gap-3'>

            <Button
              as={Link}
              to='/profile'
              variant='secondary'
            >
              Quay lại hồ sơ
            </Button>
          </div>

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {!currentUser ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để đổi mật khẩu.'
              actionLabel='Đăng nhập'
              onAction={() => navigate('/login')}
            />
          ) : (
            <Row className='g-4 justify-content-center'>
              <Col lg={7} xl={6}>
                <Card className='card-surface overflow-hidden'>
                  <div className='bg-gradient-to-br from-orange-500 to-amber-400 p-4 text-white'>
                    <div className='d-flex align-items-center gap-3'>
                      <span
                        className='d-flex align-items-center justify-content-center rounded-circle bg-white/20'
                        style={{
                          width: 56,
                          height: 56,
                        }}
                      >
                        <i className='bi bi-shield-lock-fill fs-3' />
                      </span>

                      <div>
                        <h2 className='mb-1 text-2xl font-black'>
                          Đổi mật khẩu
                        </h2>
                      </div>
                    </div>
                  </div>

                  <Card.Body className='p-4 p-lg-5'>
                    <Form onSubmit={handleSubmit}>

                      <TextField
                        label='Mật khẩu hiện tại'
                        name='current_password'
                        type={showPassword ? 'text' : 'password'}
                        value={form.current_password}
                        disabled={isSubmitting}
                        onChange={handleChange}
                        placeholder='Nhập mật khẩu hiện tại'
                        className='mb-3'
                      />

                      <TextField
                        label='Mật khẩu mới'
                        name='new_password'
                        type={showPassword ? 'text' : 'password'}
                        value={form.new_password}
                        disabled={isSubmitting}
                        onChange={handleChange}
                        placeholder='Nhập mật khẩu mới'
                        className='mb-3'
                      />

                      <TextField
                        label='Xác nhận mật khẩu mới'
                        name='confirm_password'
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirm_password}
                        disabled={isSubmitting}
                        onChange={handleChange}
                        placeholder='Nhập lại mật khẩu mới'
                        className='mb-4'
                      />

                      <div className='mb-3 d-flex justify-content-end'>
                        <button
                          type='button'
                          onClick={() => setShowPassword((prev) => !prev)}
                          className='border-0 bg-transparent p-0 text-sm font-black text-orange-600'
                        >
                          <i
                            className={`bi ${
                              showPassword ? 'bi-eye-slash' : 'bi-eye'
                            } me-2`}
                          />
                          {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        </button>
                      </div>

                      <div className='mb-4 rounded-4 border border-slate-200 bg-slate-50 p-3'>
                        <div className='d-flex flex-column gap-2'>
                          <PasswordHint valid={isLengthValid}>
                            Mật khẩu mới có ít nhất 8 ký tự
                          </PasswordHint>

                          <PasswordHint valid={Boolean(isDifferent)}>
                            Mật khẩu mới khác mật khẩu hiện tại
                          </PasswordHint>

                          <PasswordHint valid={isConfirmValid}>
                            Xác nhận mật khẩu trùng khớp
                          </PasswordHint>
                        </div>
                      </div>

                      <div className='d-flex flex-wrap justify-content-center gap-3'>
                        <Button type='submit' isLoading={isSubmitting}>
                          Đổi mật khẩu
                        </Button>

                        <Button
                          as={Link}
                          to='/profile'
                          type='button'
                          variant='secondary'
                          disabled={isSubmitting}
                        >
                          Hủy
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default ChangePasswordPage

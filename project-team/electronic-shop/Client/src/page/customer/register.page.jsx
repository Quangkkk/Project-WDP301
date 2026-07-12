import { useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import { Link, useNavigate } from 'react-router-dom'
import AuthPanel from '../../components/organisms/AuthPanel'
import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { register, verifyEmail } from '../../services/auth.service'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isDisabled = useMemo(() => !form.name || !form.email || !form.password || !form.confirmPassword || isLoading, [form, isLoading])

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    try {
      setIsLoading(true)
      const result = await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
      await verifyEmail({ email: form.email.trim(), user_id: result?.data?._id })
      setSuccess('Tạo tài khoản thành công. Hệ thống đã active tài khoản để bạn demo đăng nhập ngay.')
      setTimeout(() => navigate('/login'), 900)
    } catch (error) {
      setMessage(getErrorMessage(error, 'Đăng ký thất bại'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container className='max-w-2xl'>
          <AuthPanel title='Create account' subtitle='Tạo tài khoản customer để checkout và theo dõi đơn hàng.'>
            <Alert type='danger'>{message}</Alert>
            <Alert type='success'>{success}</Alert>
            <Form onSubmit={handleSubmit}>
              <TextField label='Full name' id='name' name='name' value={form.name} error={errors.name} onChange={handleChange} className='mb-3' />
              <TextField label='Email' id='email' name='email' type='email' value={form.email} error={errors.email} onChange={handleChange} className='mb-3' />
              <TextField label='Phone' id='phone' name='phone' value={form.phone} onChange={handleChange} className='mb-3' />
              <TextField label='Password' id='password' name='password' type='password' value={form.password} error={errors.password} onChange={handleChange} className='mb-3' />
              <TextField label='Confirm password' id='confirmPassword' name='confirmPassword' type='password' value={form.confirmPassword} error={errors.confirmPassword} onChange={handleChange} className='mb-4' />
              <Button type='submit' className='w-100 py-3' isLoading={isLoading} disabled={isDisabled}>Register</Button>
            </Form>
            <p className='mt-4 mb-0 text-center text-sm text-slate-500'>Already have an account? <Link to='/login' className='font-bold text-blue-600'>Login</Link></p>
          </AuthPanel>
        </Container>
      </section>
    </MainLayout>
  )
}

export default RegisterPage

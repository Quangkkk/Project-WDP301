import { useEffect, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import MainLayout from '../../components/templates/MainLayout'
import PageHeader from '../../components/templates/PageHeader'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import StatusBadge from '../../components/atoms/StatusBadge'
import TextAreaField from '../../components/atoms/TextAreaField'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { createTicket, getTickets } from '../../services/support.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { formatDate, pickArray } from '../../utils/format'

function SupportPage() {
  const user = getCurrentUser()
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState({ subject: '', description: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadTickets = async () => {
    if (!user) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const response = await getTickets({ user_id: getUserId(user) })
      setTickets(pickArray(response, []))
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được ticket'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadTickets() }, [])

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user) { setError('Vui lòng đăng nhập trước khi tạo ticket.'); return }
    if (!form.subject.trim() || !form.description.trim()) { setError('Vui lòng nhập subject và description.'); return }
    try {
      setIsSubmitting(true)
      await createTicket({ user_id: getUserId(user), subject: form.subject, description: form.description })
      setForm({ subject: '', description: '' })
      setMessage('Đã tạo support ticket.')
      loadTickets()
    } catch (error) {
      setError(getErrorMessage(error, 'Không tạo được ticket'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <PageHeader eyebrow='Support' title='Support Tickets' description='Tạo và theo dõi yêu cầu hỗ trợ khách hàng.' />
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>
          <Row className='g-4'>
            <Col lg={5}>
              <Card className='card-surface'><Card.Body className='p-4'>
                <h3 className='mb-4 text-2xl font-black text-slate-950'>Create Ticket</h3>
                <Form onSubmit={handleSubmit}>
                  <TextField label='Subject' name='subject' value={form.subject} onChange={handleChange} className='mb-3' />
                  <TextAreaField label='Description' name='description' value={form.description} onChange={handleChange} className='mb-4' />
                  <Button type='submit' isLoading={isSubmitting}>Send ticket</Button>
                </Form>
              </Card.Body></Card>
            </Col>
            <Col lg={7}>
              {isLoading ? <LoadingText /> : !user ? <EmptyState icon='🔐' title='Bạn cần đăng nhập' actionLabel='Login' onAction={() => window.location.assign('/login')} /> : tickets.length === 0 ? <EmptyState icon='🎧' title='Chưa có ticket' /> : tickets.map((ticket) => (
                <Card className='card-surface mb-3' key={ticket._id || ticket.id}><Card.Body className='p-4'>
                  <div className='d-flex justify-content-between gap-3 mb-2'><h3 className='mb-0 text-xl font-black text-slate-950'>{ticket.subject}</h3><StatusBadge value={ticket.status} /></div>
                  <p className='text-slate-500'>{ticket.description}</p>
                  <p className='mb-0 text-sm font-bold text-slate-400'>{formatDate(ticket.created_at)}</p>
                </Card.Body></Card>
              ))}
            </Col>
          </Row>
        </Container>
      </section>
    </MainLayout>
  )
}

export default SupportPage

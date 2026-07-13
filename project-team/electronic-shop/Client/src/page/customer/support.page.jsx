import { useEffect, useMemo, useRef, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import TextField from '../../components/atoms/TextField'

import { getErrorMessage } from '../../services/api'
import {
  createTicket,
  createTicketMessage,
  getTicketById,
  getTickets,
  updateTicket,
} from '../../services/support.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { formatDate, getId, pickArray } from '../../utils/format'

const ticketTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'open', label: 'Đang mở' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'closed', label: 'Đã đóng' },
]

function getTicketStatusLabel(status) {
  const map = {
    open: 'Đang mở',
    pending: 'Chờ xử lý',
    closed: 'Đã đóng',
  }

  return map[status] || status || 'Không xác định'
}

function getStatusClass(status) {
  const map = {
    open: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-orange-50 text-orange-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-pill px-3 py-2 text-xs font-bold ${getStatusClass(status)}`}
      style={{
        whiteSpace: 'nowrap',
      }}
    >
      {getTicketStatusLabel(status)}
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return '--'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getSenderName(message) {
  const sender = message?.sender_id

  if (!sender || typeof sender === 'string') {
    return 'Người dùng'
  }

  return sender.name || sender.email || 'Người dùng'
}

function getSenderAvatar(message) {
  const sender = message?.sender_id

  if (!sender || typeof sender === 'string') return ''

  return sender.img_url || sender.avatar || sender.avatar_url || ''
}

function getTicketDescription(ticket) {
  return ticket?.description || 'Không có mô tả.'
}

function SupportPage() {
  const user = getCurrentUser()
  const messagesEndRef = useRef(null)

  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [newMessage, setNewMessage] = useState('')
  const [createForm, setCreateForm] = useState({
    subject: '',
    description: '',
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const currentUserId = getUserId(user)

  const filteredTickets = useMemo(() => {
    if (activeTab === 'all') return tickets
    return tickets.filter((ticket) => ticket.status === activeTab)
  }, [tickets, activeTab])

  const ticketCounts = useMemo(() => {
    const countMap = {
      all: tickets.length,
    }

    for (const ticket of tickets) {
      countMap[ticket.status] = (countMap[ticket.status] || 0) + 1
    }

    return countMap
  }, [tickets])

  const isClosed = selectedTicket?.status === 'closed'

  const loadTicketDetail = async (ticketId) => {
    if (!ticketId) return

    try {
      setIsDetailLoading(true)
      setError('')

      const response = await getTicketById(ticketId)
      const data = response?.data || {}

      setSelectedTicket(data.ticket || null)
      setMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được chi tiết ticket.'))
    } finally {
      setIsDetailLoading(false)
    }
  }

  const loadTickets = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await getTickets({
        user_id: currentUserId,
      })

      const data = pickArray(response, [])
      setTickets(data)

      if (data.length > 0) {
        const currentSelectedId = getId(selectedTicket)
        const stillExists = data.some((ticket) => getId(ticket) === currentSelectedId)

        if (currentSelectedId && stillExists) {
          await loadTicketDetail(currentSelectedId)
        } else {
          await loadTicketDetail(getId(data[0]))
        }
      } else {
        setSelectedTicket(null)
        setMessages([])
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được danh sách ticket.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, selectedTicket])

  const handleCreateChange = (event) => {
    const { name, value } = event.target

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setError('')
    setMessage('')
  }

  const handleCreateTicket = async (event) => {
    event.preventDefault()

    if (!user) {
      setError('Vui lòng đăng nhập trước khi tạo ticket.')
      return
    }

    if (!createForm.subject.trim() || !createForm.description.trim()) {
      setError('Vui lòng nhập tiêu đề và nội dung hỗ trợ.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      const response = await createTicket({
        user_id: currentUserId,
        subject: createForm.subject.trim(),
        description: createForm.description.trim(),
        status: 'open',
      })

      const ticket = response?.data

      setCreateForm({
        subject: '',
        description: '',
      })
      setIsCreateModalOpen(false)
      setMessage('Đã gửi ticket hỗ trợ.')

      await loadTickets()

      if (ticket) {
        await loadTicketDetail(getId(ticket))
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Không tạo được ticket hỗ trợ.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!selectedTicket) return

    if (!newMessage.trim()) {
      setError('Vui lòng nhập nội dung tin nhắn.')
      return
    }

    try {
      setIsSending(true)
      setError('')
      setMessage('')

      await createTicketMessage(getId(selectedTicket), {
        sender_id: currentUserId,
        message: newMessage.trim(),
      })

      setNewMessage('')
      await loadTicketDetail(getId(selectedTicket))
      await loadTickets()
    } catch (error) {
      setError(getErrorMessage(error, 'Không gửi được tin nhắn.'))
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket) return

    try {
      setIsClosing(true)
      setError('')
      setMessage('')

      await updateTicket(getId(selectedTicket), {
        status: 'closed',
      })

      setMessage('Đã đóng ticket.')
      await loadTicketDetail(getId(selectedTicket))
      await loadTickets()
    } catch (error) {
      setError(getErrorMessage(error, 'Không đóng được ticket.'))
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <div className='mb-4 d-flex flex-wrap align-items-end justify-content-between gap-3'>
            <div>
              <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                Hỗ trợ khách hàng
              </p>

              <h1 className='mb-0 text-3xl font-black text-slate-950'>
                Ticket support
              </h1>
            </div>

            <Button
              type='button'
              onClick={() => setIsCreateModalOpen(true)}
            >
              Tạo ticket mới
            </Button>
          </div>

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : !user ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để gửi ticket hỗ trợ.'
              actionLabel='Đăng nhập'
              onAction={() => window.location.assign('/login')}
            />
          ) : (
            <Row className='g-4'>
              <Col lg={4}>
                <Card className='card-surface overflow-hidden'>
                  <Card.Body className='p-0'>
                    <div className='border-bottom bg-white p-3'>
                      <div className='d-flex flex-wrap gap-2'>
                        {ticketTabs.map((tab) => {
                          const isActive = activeTab === tab.key

                          return (
                            <button
                              key={tab.key}
                              type='button'
                              onClick={() => setActiveTab(tab.key)}
                              className={`rounded-4 border px-3 py-2 text-sm font-bold transition ${
                                isActive
                                  ? 'border-orange-500 bg-orange-500 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                              }`}
                            >
                              {tab.label}

                              <span
                                className={`ms-2 rounded-3 px-2 py-1 text-xs ${
                                  isActive
                                    ? 'bg-white text-orange-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {ticketCounts[tab.key] || 0}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {filteredTickets.length === 0 ? (
                      <div className='p-4'>
                        <EmptyState
                          icon='🎧'
                          title='Chưa có ticket'
                          description='Bạn chưa có yêu cầu hỗ trợ nào trong mục này.'
                        />
                      </div>
                    ) : (
                      <div
                        className='d-flex flex-column overflow-auto'
                        style={{
                          maxHeight: 650,
                        }}
                      >
                        {filteredTickets.map((ticket) => {
                          const ticketId = getId(ticket)
                          const isActive = getId(selectedTicket) === ticketId

                          return (
                            <button
                              key={ticketId}
                              type='button'
                              onClick={() => loadTicketDetail(ticketId)}
                              className={`border-0 border-bottom p-3 text-start transition ${
                                isActive
                                  ? 'bg-orange-50'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className='mb-2 d-flex align-items-start justify-content-between gap-2'>
                                <h3 className='mb-0 text-base font-semibold text-slate-950'>
                                  {ticket.subject}
                                </h3>

                                <StatusPill status={ticket.status} />
                              </div>

                              <p className='mb-2 text-sm text-slate-500'>
                                {getTicketDescription(ticket)}
                              </p>

                              <p className='mb-0 text-xs text-slate-400'>
                                Cập nhật: {formatDate(ticket.updated_at || ticket.created_at)}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={8}>
                <Card
                  className='card-surface overflow-hidden'
                  style={{
                    minHeight: 650,
                  }}
                >
                  {!selectedTicket ? (
                    <Card.Body className='d-flex align-items-center justify-content-center p-5'>
                      <EmptyState
                        icon='💬'
                        title='Chọn một ticket'
                        description='Chọn ticket ở bên trái để xem nội dung và gửi tin nhắn.'
                      />
                    </Card.Body>
                  ) : (
                    <>
                      <div className='border-bottom bg-white p-4'>
                        <div className='d-flex flex-wrap align-items-start justify-content-between gap-3'>
                          <div>
                            <div className='mb-2 d-flex flex-wrap align-items-center gap-2'>
                              <h2 className='mb-0 text-2xl font-semibold text-slate-950'>
                                {selectedTicket.subject}
                              </h2>

                              <StatusPill status={selectedTicket.status} />
                            </div>

                            <p className='mb-0 text-sm text-slate-500'>
                              Tạo lúc {formatDateTime(selectedTicket.created_at)}
                            </p>
                          </div>

                          {!isClosed && (
                            <Button
                              type='button'
                              variant='secondary'
                              onClick={handleCloseTicket}
                              isLoading={isClosing}
                            >
                              Đóng ticket
                            </Button>
                          )}
                        </div>
                      </div>

                      <div
                        className='bg-slate-50 p-4'
                        style={{
                          height: 430,
                          overflowY: 'auto',
                        }}
                      >
                        {isDetailLoading ? (
                          <LoadingText />
                        ) : messages.length === 0 ? (
                          <EmptyState
                            icon='💬'
                            title='Chưa có tin nhắn'
                            description='Bạn có thể gửi tin nhắn đầu tiên cho ticket này.'
                          />
                        ) : (
                          <div className='d-flex flex-column gap-3'>
                            {messages.map((item) => {
                              const senderId = getId(item.sender_id)
                              const isMine = senderId === currentUserId
                              const avatar = getSenderAvatar(item)

                              return (
                                <div
                                  key={getId(item)}
                                  className={`d-flex gap-2 ${
                                    isMine
                                      ? 'justify-content-end'
                                      : 'justify-content-start'
                                  }`}
                                >
                                  {!isMine && (
                                    <div
                                      className='d-flex align-items-center justify-content-center overflow-hidden rounded-circle bg-white text-sm font-bold text-orange-600 shadow-sm'
                                      style={{
                                        width: 36,
                                        height: 36,
                                        minWidth: 36,
                                      }}
                                    >
                                      {avatar ? (
                                        <img
                                          src={avatar}
                                          alt={getSenderName(item)}
                                          className='h-100 w-100 object-fit-cover'
                                        />
                                      ) : (
                                        getSenderName(item).charAt(0).toUpperCase()
                                      )}
                                    </div>
                                  )}

                                  <div
                                    className={`rounded-4 px-3 py-2 shadow-sm ${
                                      isMine
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white text-slate-800'
                                    }`}
                                    style={{
                                      maxWidth: '74%',
                                    }}
                                  >
                                    <p
                                      className={`mb-1 text-xs ${
                                        isMine ? 'text-orange-100' : 'text-slate-400'
                                      }`}
                                    >
                                      {isMine ? 'Bạn' : getSenderName(item)} ·{' '}
                                      {formatDateTime(item.created_at)}
                                    </p>

                                    <p className='mb-0 whitespace-pre-line text-sm'>
                                      {item.message}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}

                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>

                      <div className='border-top bg-white p-3'>
                        {isClosed ? (
                          <div className='rounded-4 bg-slate-100 px-3 py-3 text-center text-sm font-bold text-slate-500'>
                            Ticket đã đóng, không thể gửi thêm tin nhắn.
                          </div>
                        ) : (
                          <Form onSubmit={handleSendMessage}>
                            <div className='d-flex align-items-end gap-2'>
                              <Form.Control
                                as='textarea'
                                rows={2}
                                value={newMessage}
                                onChange={(event) => setNewMessage(event.target.value)}
                                placeholder='Nhập tin nhắn hỗ trợ...'
                                className='rounded-4 border-slate-200 text-sm shadow-sm'
                                style={{
                                  resize: 'none',
                                }}
                              />

                              <Button
                                type='submit'
                                isLoading={isSending}
                                className='px-4'
                              >
                                Gửi
                              </Button>
                            </div>
                          </Form>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>

      <Modal
        show={isCreateModalOpen}
        onHide={() => !isSubmitting && setIsCreateModalOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className='font-bold text-slate-950'>
            Tạo ticket hỗ trợ
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateTicket}>
          <Modal.Body>
            <TextField
              label='Tiêu đề'
              name='subject'
              value={createForm.subject}
              onChange={handleCreateChange}
              placeholder='Ví dụ: Cần hỗ trợ về đơn hàng'
              className='mb-3'
            />

            <Form.Group>
              <Form.Label className='mb-2 text-sm font-bold text-slate-700'>
                Nội dung
              </Form.Label>

              <Form.Control
                as='textarea'
                rows={4}
                name='description'
                value={createForm.description}
                onChange={handleCreateChange}
                placeholder='Mô tả vấn đề bạn đang gặp...'
                className='rounded-4 border-slate-200 text-sm shadow-sm'
                style={{
                  resize: 'vertical',
                }}
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>

            <Button type='submit' isLoading={isSubmitting}>
              Gửi ticket
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default SupportPage
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
  uploadSupportFiles
} from '../../services/support.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { formatDate, getId, pickArray } from '../../utils/format'
import MessageAttachments from '../../components/molecules/MessageAttachments'

const ticketTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'open', label: 'Đang mở' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'closed', label: 'Đã đóng' },
]

function getTicketStatusLabel(status) {
  const map = {
    open: 'Đang mở',
    pending: 'Đang xử lý',
    in_progress: 'Đang xử lý',
    closed: 'Đã đóng',
  }

  return map[status] || status || 'Không xác định'
}

function getStatusClass(status) {
  const map = {
    open: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-orange-50 text-orange-700',
    in_progress: 'bg-orange-50 text-orange-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ status }) {
  return (
    <span
      className={`!rounded-pill px-3 py-2 text-xs font-bold ${getStatusClass(status)}`}
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
    category: 'general'
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
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
    return tickets.filter((ticket) => {
      if (activeTab === 'in_progress') return ticket.status === 'in_progress' || ticket.status === 'pending'
      return ticket.status === activeTab
    })
  }, [tickets, activeTab])

  const ticketCounts = useMemo(() => {
    const countMap = {
      all: tickets.length,
    }

    for (const ticket of tickets) {
      const statusKey = ticket.status === 'pending' ? 'in_progress' : ticket.status
      countMap[statusKey] = (countMap[statusKey] || 0) + 1
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
        category: createForm.category,
        status: 'open',
      })

      const ticket = response?.data

      setCreateForm({
        subject: '',
        description: '',
        category: 'general'
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

    if (!newMessage.trim() && selectedFiles.length === 0) {
      setError('Vui lòng nhập nội dung tin nhắn hoặc đính kèm file.')
      return
    }

    try {
      setIsSending(true)
      setIsUploading(selectedFiles.length > 0)
      setError('')
      setMessage('')

      let uploadedAttachments = []
      if (selectedFiles.length > 0) {
        const uploadResponse = await uploadSupportFiles(selectedFiles)
        uploadedAttachments = uploadResponse?.data || []
      }

      await createTicketMessage(getId(selectedTicket), {
        sender_id: currentUserId,
        message: newMessage.trim(),
        attachments: uploadedAttachments
      })

      setNewMessage('')
      setSelectedFiles([])
      await loadTicketDetail(getId(selectedTicket))
      await loadTickets()
    } catch (error) {
      setError(getErrorMessage(error, 'Không gửi được tin nhắn.'))
    } finally {
      setIsSending(false)
      setIsUploading(false)
    }
  }

  const handleSelectFiles = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const validFiles = files.slice(0, 5)
    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5))
    event.target.value = ''
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
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
                      <Form.Group>
                        <Form.Label className='mb-2 d-flex align-items-center gap-2 text-sm font-black text-slate-700'>
                          <span
                            className='d-flex align-items-center justify-content-center !rounded-circle bg-orange-50 text-orange-600'
                            style={{
                              width: 28,
                              height: 28,
                            }}
                          >
                            <i className='bi bi-funnel-fill' />
                          </span>

                          Lọc theo trạng thái
                        </Form.Label>

                        <Form.Select
                          value={activeTab}
                          onChange={(event) => setActiveTab(event.target.value)}
                          className='!rounded-4 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm'
                        >
                          {ticketTabs.map((tab) => (
                            <option key={tab.key} value={tab.key}>
                              {tab.label} ({ticketCounts[tab.key] || 0})
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
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
                              className={`border-0 border-bottom p-3 text-start transition ${isActive
                                  ? 'bg-orange-50'
                                  : 'bg-white hover:bg-slate-50'
                                }`}
                            >
                              <div className='mb-2 d-flex align-items-start justify-content-between gap-2'>
                                <h4 className='mb-0 text-base font-semibold text-slate-950'>
                                  {ticket.subject}
                                </h4>

                                <div className='d-flex align-items-center gap-2'>
                                  <StatusPill status={ticket.status} />
                                </div>
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
                              <h3 className='mb-0 text-2xl font-semibold text-slate-950'>
                                {selectedTicket.subject}
                              </h3>

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
                                  className={`d-flex gap-2 ${isMine
                                      ? 'justify-content-end'
                                      : 'justify-content-start'
                                    }`}
                                >
                                  {!isMine && (
                                    <div
                                      className='d-flex align-items-center justify-content-center overflow-hidden !rounded-circle bg-white text-sm font-bold text-orange-600 shadow-sm'
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
                                    className={`!rounded-4 px-3 py-2 shadow-sm ${isMine
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white text-slate-800'
                                      }`}
                                    style={{
                                      maxWidth: '74%',
                                    }}
                                  >
                                    <p
                                      className={`mb-1 text-xs ${isMine ? 'text-orange-100' : 'text-slate-400'
                                        }`}
                                    >
                                      {isMine ? 'Bạn' : getSenderName(item)} ·{' '}
                                      {formatDateTime(item.created_at)}
                                    </p>

                                    <p className='mb-0 whitespace-pre-line text-sm'>
                                      {item.message}
                                    </p>
                                    <MessageAttachments attachments={item.attachments || []} isMine={isMine} />
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
                          <div className='!rounded-4 bg-slate-100 px-3 py-3 text-center text-sm font-bold text-slate-500'>
                            Ticket đã đóng, không thể gửi thêm tin nhắn.
                          </div>
                        ) : (
                          <Form onSubmit={handleSendMessage}>
                            {selectedFiles.length > 0 && (
                              <div className='mb-2 d-flex flex-wrap gap-2'>
                                {selectedFiles.map((file, index) => (
                                  <div
                                    key={`${file.name}-${index}`}
                                    className='d-flex align-items-center gap-2 !rounded-pill border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700'
                                  >
                                    <i className={file.type.startsWith('image/') ? 'bi bi-image' : 'bi bi-paperclip'} />
                                    <span>{file.name}</span>
                                    <button
                                      type='button'
                                      onClick={() => handleRemoveFile(index)}
                                      className='border-0 bg-transparent p-0 text-red-500'
                                      title='Bỏ file'
                                    >
                                      <i className='bi bi-x-lg' />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <input
                              ref={fileInputRef}
                              type='file'
                              multiple
                              accept='image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip'
                              onChange={handleSelectFiles}
                              className='d-none'
                            />
                            <div className='d-flex align-items-center gap-2'>
                              <button
                                type='button'
                                onClick={() => fileInputRef.current?.click()}
                                className='d-flex align-items-center justify-content-center !rounded-circle border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                                style={{ width: 40, height: 40, minWidth: 40 }}
                                title='Đính kèm ảnh/file'
                              >
                                <i className='bi bi-paperclip fs-5' />
                              </button>
                              <Form.Control
                                type='text'
                                value={newMessage}
                                onChange={(event) => setNewMessage(event.target.value)}
                                placeholder='Nhập tin nhắn hỗ trợ...'
                                className='!rounded-pill px-4 shadow-none flex-1'
                                disabled={isSending || isUploading}
                              />

                              <Button
                                type='submit'
                                disabled={isSending || isUploading || (!newMessage.trim() && selectedFiles.length === 0)}
                                className='px-4'
                              >
                                {isUploading ? 'Đang gửi...' : 'Gửi'}
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

            <div className='mb-3 d-flex gap-3'>
              <Form.Group className='flex-1'>
                <Form.Label className='mb-2 text-sm font-bold text-slate-700'>Danh mục</Form.Label>
                <Form.Select name='category' value={createForm.category} onChange={handleCreateChange} className='!rounded-4 shadow-sm text-sm'>
                  <option value="general">Hỗ trợ chung</option>
                  <option value="warranty">Bảo hành / Đổi trả</option>
                  <option value="technical">Kỹ thuật</option>
                  <option value="shipping">Vận chuyển</option>
                </Form.Select>
              </Form.Group>
            </div>
            
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
                className='!rounded-4 border-slate-200 text-sm shadow-sm'
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
import { useEffect, useMemo, useRef, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Badge from 'react-bootstrap/Badge'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'

import { getErrorMessage, API_BASE_URL } from '../../services/api'
import {
  createTicketMessage,
  getTicketById,
  getTickets,
  updateTicket,
  uploadSupportFiles
} from '../../services/support.service'
import { getAccessToken, getCurrentUser, getUserId } from '../../utils/authStorage'
import { io } from 'socket.io-client'
import { useLocation } from 'react-router-dom'
import { formatDate, getId, pickArray } from '../../utils/format'
import MessageAttachments from '../../components/molecules/MessageAttachments'

// ---- Toast notification ----
let spToastIdCounter = 0

function SupportToast({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <>
      <style>{`
        @keyframes spToastSlide {
          from { opacity: 0; transform: translateY(-18px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spBadgePop {
          0%,100% { transform: scale(1); }
          40% { transform: scale(1.3); }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => onRemove(t.id)}
            style={{
              pointerEvents: 'auto',
              background: t.type === 'new_ticket'
                ? 'linear-gradient(135deg,#7c3aed 0%,#9333ea 100%)'
                : 'linear-gradient(135deg,#0f766e 0%,#0d9488 100%)',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 18px 12px 14px',
              boxShadow: t.type === 'new_ticket'
                ? '0 8px 32px rgba(124,58,237,0.35)'
                : '0 8px 32px rgba(13,148,136,0.35)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              minWidth: 300, maxWidth: 420,
              cursor: 'pointer',
              animation: 'spToastSlide 0.35s cubic-bezier(.21,1.02,.73,1) both',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>{t.type === 'new_ticket' ? '🎫' : '💬'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t.title}</div>
              <div style={{
                fontSize: 12, opacity: 0.88, lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{t.text}</div>
            </div>
            <span style={{ opacity: 0.7, fontSize: 18, alignSelf: 'flex-start', flexShrink: 0, paddingTop: 2 }}>×</span>
          </div>
        ))}
      </div>
    </>
  )
}

function playSpSound(type = 'message') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const play = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type === 'new_ticket' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    if (type === 'new_ticket') {
      play(440, 0, 0.12); play(550, 0.14, 0.12); play(660, 0.28, 0.15); play(880, 0.44, 0.2)
    } else {
      play(660, 0, 0.1); play(880, 0.13, 0.13)
    }
  } catch(e) {}
}

const ticketTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'open', label: 'Đang mở' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'closed', label: 'Đã đóng' },
]

function getTicketStatusLabel(status) {
  const map = { open: 'Đang mở', in_progress: 'Đang xử lý', pending: 'Đang xử lý', closed: 'Đã đóng' }
  return map[status] || status || 'Không xác định'
}

function getStatusClass(status) {
  const map = {
    open: 'bg-emerald-50 text-emerald-700',
    in_progress: 'bg-orange-50 text-orange-700',
    pending: 'bg-orange-50 text-orange-700',
    closed: 'bg-slate-100 text-slate-600',
  }
  return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ status }) {
  return (
    <span className={`!rounded-pill px-2 py-1 text-xs font-bold ${getStatusClass(status)}`} style={{ whiteSpace: 'nowrap' }}>
      {getTicketStatusLabel(status)}
    </span>
  )
}

function getCategoryLabel(cat) {
  if (!cat) return ''
  const map = {
    general: 'Chung',
    warranty: 'Bảo hành',
    technical: 'Kỹ thuật',
    shipping: 'Vận chuyển',
    billing: 'Thanh toán',
    refund: 'Hoàn tiền'
  }
  return map[cat.toLowerCase()] || cat
}

function formatDateTime(value) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function getSenderName(message) {
  const sender = message?.sender_id
  if (!sender || typeof sender === 'string') return 'Người dùng'
  return sender.name || sender.email || 'Người dùng'
}

function getSenderAvatar(message) {
  const sender = message?.sender_id
  if (!sender || typeof sender === 'string') return ''
  return sender.img_url || sender.avatar || sender.avatar_url || ''
}

function SupportManagementPage() {
  const user = getCurrentUser()
  const messagesEndRef = useRef(null)
  const location = useLocation()

  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [newMessage, setNewMessage] = useState('')
  
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Notification state
  const [toasts, setToasts] = useState([])
  const [unreadTickets, setUnreadTickets] = useState({}) // ticketId -> count
  const knownTicketIdsRef = useRef(null)   // set of known ticket IDs
  const knownMsgCountsRef = useRef({})     // ticketId -> message count
  const selectedTicketRef = useRef(null)   // để dùng trong polling closure

  const currentUserId = getUserId(user)

  // Đồng bộ selectedTicketRef
  useEffect(() => { selectedTicketRef.current = selectedTicket }, [selectedTicket])

  const addToast = (title, text, type = 'message') => {
    const id = ++spToastIdCounter
    setToasts((prev) => [...prev, { id, title, text, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const filteredTickets = useMemo(() => {
    let result = tickets
    if (activeTab !== 'all') result = result.filter((ticket) => ticket.status === activeTab)
    return result
  }, [tickets, activeTab])

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
    try {
      setIsLoading(true)
      setError('')
      const response = await getTickets()
      const data = pickArray(response, [])
      setTickets(data)

      if (data.length > 0) {
        const ticketIdFromState = location.state?.ticketId
        const currentSelectedId = getId(selectedTicket)

        if (ticketIdFromState && data.some(t => String(getId(t)) === String(ticketIdFromState))) {
          await loadTicketDetail(ticketIdFromState)
        } else if (currentSelectedId && data.some((t) => getId(t) === currentSelectedId)) {
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

  // Chọn ticket từ notification click (thay đổi state)
  useEffect(() => {
    if (location.state?.ticketId && tickets.length > 0) {
      const tid = location.state.ticketId
      if (!selectedTicket || String(getId(selectedTicket)) !== String(tid)) {
        const t = tickets.find(x => String(getId(x)) === String(tid))
        if (t) {
          loadTicketDetail(tid)
        }
      }
    }
  }, [location.state, tickets])

  // Socket: Lắng nghe phản hồi từ khách hàng realtime
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    const socket = io(API_BASE_URL, { auth: { token } })

    socket.on('connect', () => {
      socket.emit('chat:joinStaffRoom')
    })

    socket.on('staff_receive_ticket_message', ({ ticketId, message }) => {
      // 1. Nếu ticket này đang được chọn -> append vào messages (realtime cập nhật msg)
      if (selectedTicketRef.current && getId(selectedTicketRef.current) === ticketId) {
        setMessages(prev => {
          if (prev.find(m => getId(m) === getId(message))) return prev;
          return [...prev, message];
        })
      } else {
        // 2. Nếu ticket này không đang được chọn -> đánh dấu unread và báo sound
        setUnreadTickets(prev => ({ ...prev, [ticketId]: (prev[ticketId] || 0) + 1 }))
        playSpSound('message')
        addToast(`Ticket #${ticketId.substring(ticketId.length-6).toUpperCase()}`, 'Có phản hồi mới từ khách hàng')
      }
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const poll = async () => {
      try {
        const response = await getTickets()
        const data = pickArray(response, [])

        if (knownTicketIdsRef.current === null) {
          // Lần đầu: khởi tạo baseline, chưa thông báo
          knownTicketIdsRef.current = new Set(data.map((t) => getId(t)))
          data.forEach((t) => {
            knownMsgCountsRef.current[getId(t)] = t.message_count ?? 0
          })
          return
        }

        // Kiểm tra ticket mới
        data.forEach((t) => {
          const tid = getId(t)
          if (!knownTicketIdsRef.current.has(tid)) {
            // Ticket mới
            knownTicketIdsRef.current.add(tid)
            knownMsgCountsRef.current[tid] = t.message_count ?? 0

            const notifTitle = 'Ticket hỗ trợ mới'
            const notifBody = `${t.user_id?.name || 'Khách'}: ${t.subject || 'Yêu cầu mới'}`
            addToast(notifTitle, notifBody, 'new_ticket')
            playSpSound('new_ticket')

            setUnreadTickets((prev) => ({ ...prev, [tid]: 1 }))

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notifTitle, { body: notifBody, icon: '/vite.svg', tag: `ticket-new-${tid}` })
            }
          }
        })

        // Cập nhật danh sách ticket
        setTickets(data)
      } catch (e) {}
    }

    const intervalId = setInterval(poll, 30000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => { loadTickets() }, [])


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, selectedTicket])

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

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return
    try {
      setIsUpdating(true)
      setError('')
      setMessage('')
      await updateTicket(getId(selectedTicket), { status })
      setMessage('Đã cập nhật trạng thái ticket.')
      await loadTicketDetail(getId(selectedTicket))
      await loadTickets()
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được ticket.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSelectFiles = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5))
    event.target.value = ''
  }

  return (
    <DashboardLayout title='Quản lý yêu cầu hỗ trợ' description='Xử lý ticket từ khách hàng.'>
      {/* Toast thông báo */}
      <SupportToast toasts={toasts} onRemove={removeToast} />
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      {isLoading ? (
        <LoadingText />
      ) : (
        <Row className='g-4' style={{ height: 'calc(100vh - 280px)', minHeight: 650 }}>
          <Col lg={4} className='h-100'>
            <Card className='card-surface h-100 overflow-hidden d-flex flex-column'>
              <div className='bg-white p-3 border-bottom'>
                <Form.Group className='mb-2'>
                  <Form.Label className='text-xs font-bold'>Trạng thái</Form.Label>
                  <Form.Select size="sm" value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
                    {ticketTabs.map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className='flex-1 overflow-auto bg-slate-50'>
                {filteredTickets.length === 0 ? (
                  <div className='p-4 text-center text-sm text-slate-500'>Không có ticket nào</div>
                ) : (
                  filteredTickets.map((ticket) => {
                    const ticketId = getId(ticket)
                    const isActive = getId(selectedTicket) === ticketId
                    const hasUnread = unreadTickets[ticketId] > 0
                    return (
                      <div
                        key={ticketId}
                        onClick={() => {
                          loadTicketDetail(ticketId)
                          setUnreadTickets((prev) => ({ ...prev, [ticketId]: 0 }))
                        }}
                        className={`border-bottom p-3 cursor-pointer transition ${isActive ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                        style={hasUnread ? { borderLeft: '3px solid #7c3aed' } : {}}
                      >
                        <div className='mb-1 d-flex justify-content-between align-items-center'>
                          <h6 className={`mb-0 text-sm font-bold ${hasUnread ? 'text-purple-700' : 'text-slate-900'}`}>
                            {hasUnread && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', marginRight: 6, verticalAlign: 'middle', animation: 'spBadgePop 1s ease infinite' }} />}
                            {ticket.subject}
                          </h6>
                          <div className='d-flex align-items-center gap-1'>
                            {hasUnread && (
                              <span style={{
                                background: '#7c3aed', color: '#fff',
                                borderRadius: 999, fontSize: 10, fontWeight: 700,
                                padding: '1px 7px', lineHeight: '18px',
                              }}>Mới</span>
                            )}
                            <StatusPill status={ticket.status} />
                          </div>
                        </div>
                        <div className='mb-1 text-xs text-slate-500 d-flex gap-2 align-items-center'>
                          <span>{ticket.user_id?.name || ticket.user_id?.email || 'Khách'}</span>
                          {ticket.category && <Badge bg="secondary">{getCategoryLabel(ticket.category)}</Badge>}
                        </div>
                        <div className='text-[10px] text-slate-400'>
                          Cập nhật: {formatDate(ticket.updated_at || ticket.created_at)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </Col>

          <Col lg={8} className='h-100'>
            <Card className='card-surface h-100 overflow-hidden d-flex flex-column'>
              {!selectedTicket ? (
                <Card.Body className='d-flex align-items-center justify-content-center p-5'>
                  <EmptyState icon='🎧' title='Chọn một ticket' description='Chọn ticket ở bên trái để xem nội dung và xử lý.' />
                </Card.Body>
              ) : (
                <>
                  <div className='border-bottom bg-white p-4 d-flex justify-content-between align-items-start'>
                    <div>
                      <h4 className='mb-1 font-bold'>{selectedTicket.subject}</h4>
                      <div className='text-sm text-slate-500 d-flex gap-2 mb-2'>
                        Khách: <b>{selectedTicket.user_id?.name || selectedTicket.user_id?.email}</b>
                      </div>
                      <div className='d-flex gap-2'>
                        <StatusPill status={selectedTicket.status} />
                        {selectedTicket.category && <Badge bg="secondary">{getCategoryLabel(selectedTicket.category)}</Badge>}
                      </div>
                    </div>
                    <div className='d-flex gap-2'>
                      {selectedTicket.status !== 'open' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('open')} disabled={isUpdating}>Mở lại</Button>
                      )}
                      {(selectedTicket.status === 'open') && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('in_progress')} disabled={isUpdating}>Nhận xử lý</Button>
                      )}
                      {selectedTicket.status !== 'closed' && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus('closed')} disabled={isUpdating}>Đóng ticket</Button>
                      )}
                    </div>
                  </div>

                  <div className='flex-1 overflow-auto bg-slate-50 p-4'>
                    {isDetailLoading ? (
                      <LoadingText />
                    ) : messages.length === 0 ? (
                      <EmptyState icon='💬' title='Chưa có tin nhắn' />
                    ) : (
                      <div className='d-flex flex-column gap-3'>
                        {messages.map((item) => {
                          const isMine = String(item.sender_id?._id || item.sender_id) === String(currentUserId)
                          const avatar = getSenderAvatar(item)
                          return (
                            <div key={getId(item)} className={`d-flex gap-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                              {!isMine && (
                                <div className='!rounded-circle bg-white shadow-sm d-flex justify-content-center align-items-center font-bold text-blue-600' style={{ width: 32, height: 32 }}>
                                  {avatar ? <img src={avatar} className='w-100 h-100 rounded-circle' alt='avatar' /> : getSenderName(item).charAt(0)}
                                </div>
                              )}
                              <div className={`!rounded-4 px-3 py-2 shadow-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'}`} style={{ maxWidth: '75%' }}>
                                <p className={`mb-1 text-[10px] ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {isMine ? 'Bạn' : getSenderName(item)} · {formatDateTime(item.created_at)}
                                </p>
                                <p className='mb-0 text-sm whitespace-pre-line'>{item.message}</p>
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
                    <Form onSubmit={handleSendMessage}>
                      {selectedFiles.length > 0 && (
                        <div className='mb-2 d-flex flex-wrap gap-2'>
                          {selectedFiles.map((file, i) => (
                            <div key={i} className='badge bg-slate-100 text-slate-700 p-2 d-flex align-items-center gap-1 border'>
                              {file.name} 
                              <i className='bi bi-x cursor-pointer text-danger' onClick={() => setSelectedFiles(p => p.filter((_, idx) => idx !== i))} />
                            </div>
                          ))}
                        </div>
                      )}
                      <input ref={fileInputRef} type='file' multiple className='d-none' onChange={handleSelectFiles} />
                      <div className='d-flex gap-2'>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="px-3">
                          <i className='bi bi-paperclip' />
                        </Button>
                        <Form.Control
                          type='text'
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder='Nhập phản hồi...'
                          disabled={isSending || isUploading || selectedTicket.status === 'closed'}
                        />
                        <Button type='submit' disabled={isSending || isUploading || selectedTicket.status === 'closed' || (!newMessage.trim() && selectedFiles.length === 0)}>
                          {isUploading ? 'Đang gửi...' : 'Gửi'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </DashboardLayout>
  )
}

export default SupportManagementPage

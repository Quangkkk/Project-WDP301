import { useEffect, useRef, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import { io } from 'socket.io-client'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import LoadingText from '../../components/atoms/LoadingText'
import api, { API_BASE_URL, getErrorMessage } from '../../services/api'
import { getAccessToken, getCurrentUser } from '../../utils/authStorage'
import { formatDate, getId } from '../../utils/format'
import { useLocation } from 'react-router-dom'
import { uploadChatFiles } from '../../services/chat.service'
import { createTicketFromChat } from '../../services/support.service'
import MessageAttachments from '../../components/molecules/MessageAttachments'

// ---- Toast notification trong app ----
let toastIdCounter = 0

function InAppToast({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <>
      <style>{`
        @keyframes chatMgrToastIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatMgrBadgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(239,68,68,0); }
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
              background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 100%)',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 18px 12px 14px',
              boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              minWidth: 300, maxWidth: 400,
              cursor: 'pointer',
              animation: 'chatMgrToastIn 0.35s cubic-bezier(.21,1.02,.73,1) both',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>💬</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                Tin nhắn mới từ {t.customerName || 'Khách hàng'}
              </div>
              <div style={{
                fontSize: 12, opacity: 0.88,
                wordBreak: 'break-word', lineHeight: 1.45,
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

// Tạo âm thanh thông báo đẹp
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const play = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(660, 0, 0.1); play(880, 0.12, 0.1); play(1100, 0.24, 0.15)
  } catch(e) {}
}

function ChatManagementPage() {
  const [toasts, setToasts] = useState([])

  const addToast = (text, customerName) => {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, text, customerName }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))
  const user = getCurrentUser()
  const token = getAccessToken()

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isCustomerTyping, setIsCustomerTyping] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})
  const [globalSocket, setGlobalSocket] = useState(null)
  
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [chatError, setChatError] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  const socketRef = useRef(null)
  const chatEndRef = useRef(null)
  const location = useLocation()

  // Chọn conversation từ Notification (thông qua location.state)
  useEffect(() => {
    if (location.state?.conversationId && conversations.length > 0) {
      const convId = location.state.conversationId
      const conv = conversations.find(c => String(getId(c)) === String(convId))
      if (conv && (!selectedConv || String(getId(selectedConv)) !== String(convId))) {
        setSelectedConv(conv)
      }
    }
  }, [location.state, conversations])

  // Cuon xuong tin nhan cuoi cung
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Tai danh sach hoi thoai cua Staff
  const loadConversations = async () => {
    try {
      setIsLoadingList(true)
      setError('')
      const res = await api.get('/chat/conversations')
      setConversations(res.data?.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách hội thoại.'))
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    loadConversations()
    
    // Yêu cầu quyền gửi thông báo
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }

    // Connect global socket
    const socket = io(API_BASE_URL, { auth: { token } })
    
    socket.on('connect', () => {
      socket.emit('chat:joinStaffRoom')
    })

    setGlobalSocket(socket)
    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  // Lắng nghe tin nhắn mới trên toàn cục
  useEffect(() => {
    if (!globalSocket) return

    const handleStaffReceiveMessage = ({ conversationId, message }) => {
      // Bỏ qua tin nhắn do chính mình gửi
      const myId = user._id || user.id || user.user_id
      if (String(message.sender_id?._id || message.sender_id) === String(myId)) return

      // Cập nhật danh sách (đưa lên đầu)
      let customerName = 'Khách hàng'
      setConversations(prev => {
        const idx = prev.findIndex(c => String(getId(c)) === String(conversationId))
        if (idx > -1) {
          const newArr = [...prev]
          const [conv] = newArr.splice(idx, 1)
          conv.updated_at = new Date()
          customerName = conv.customer_id?.name || 'Khách hàng'
          return [conv, ...newArr]
        }
        return prev
      })

      // Nếu không phải là đoạn chat đang chọn, tăng unread + thông báo
      const isCurrentConv = selectedConv && String(getId(selectedConv)) === String(conversationId)
      if (!isCurrentConv) {
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1
        }))

        // Toast notification trong app
        addToast(message.message || 'Đã gửi một tệp đính kèm', customerName)

        // Âm thanh thông báo
        playNotifSound()

        // Browser notification (fallback)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Tin nhắn mới từ ${customerName}`, {
            body: message.message || 'Đã gửi một tệp đính kèm',
            icon: '/vite.svg',
            tag: `chat-${conversationId}`,
          })
        }
      }
    }

    globalSocket.on('staff_receive_message', handleStaffReceiveMessage)

    return () => {
      globalSocket.off('staff_receive_message', handleStaffReceiveMessage)
    }
  }, [globalSocket, selectedConv, user])

  // Ket noi socket va lay tin nhan khi chon mot cuoc hoi thoai
  useEffect(() => {
    if (!selectedConv) return
    
    // Khi mở chat thì xóa unread count
    setUnreadCounts(prev => ({ ...prev, [getId(selectedConv)]: 0 }))

    let active = true

    const connectChat = async () => {
      try {
        setIsLoadingChat(true)
        setChatError('')
        setMessages([])
        setIsCustomerTyping(false)

        // 1. Lay lich su tin nhan
        const res = await api.get(`/chat/conversations/${getId(selectedConv)}/messages`)
        if (!active) return
        setMessages(res.data?.data?.messages || [])

        if (globalSocket) {
          globalSocket.emit('join_conversation', { conversation_id: getId(selectedConv) })

          globalSocket.on('receive_message', (msg) => {
            setMessages((prev) => {
              // Tránh duplicate nếu event staff_receive_message cũng gọi (dù staff_receive_message ko setMessages)
              if (prev.find(m => String(m._id) === String(msg._id))) return prev
              return [...prev, msg]
            })
          })

          globalSocket.on('customer_typing', ({ is_typing }) => {
            setIsCustomerTyping(is_typing)
          })
        }
      } catch (err) {
        if (active) {
          setChatError(getErrorMessage(err, 'Không thể kết nối phòng chat.'))
        }
      } finally {
        if (active) setIsLoadingChat(false)
      }
    }

    connectChat()

    return () => {
      active = false
      if (globalSocket) {
        globalSocket.off('receive_message')
        globalSocket.off('customer_typing')
      }
    }
  }, [selectedConv, globalSocket])

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

  // Gui tin nhan
  const handleSend = async (e) => {
    e.preventDefault()
    if ((!inputText.trim() && selectedFiles.length === 0) || !selectedConv || !socketRef.current) return

    let uploadedAttachments = []
    
    try {
      if (selectedFiles.length > 0) {
        setIsUploading(true)
        const uploadResponse = await uploadChatFiles(selectedFiles)
        uploadedAttachments = uploadResponse?.data || []
      }

      // Emit event gui tin nhan
      socketRef.current.emit('send_message', {
        conversation_id: getId(selectedConv),
        message: inputText.trim(),
        attachments: uploadedAttachments
      })

      // Emit ngung go phim
      socketRef.current.emit('staff_typing', {
        conversation_id: getId(selectedConv),
        is_typing: false,
      })

      setInputText('')
      setSelectedFiles([])
    } catch (err) {
      setChatError(getErrorMessage(err, 'Không gửi được tin nhắn/file.'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleConvertToTicket = async () => {
    if (!selectedConv) return
    if (window.confirm("Bạn có chắc muốn chuyển cuộc hội thoại này thành Support Ticket không? Cuộc hội thoại sẽ được đóng.")) {
      try {
        setIsConverting(true)
        await createTicketFromChat(getId(selectedConv), {
          subject: 'Hỗ trợ từ Chat',
          category: 'general'
        })
        alert("Đã chuyển thành Ticket thành công!")
        setSelectedConv(null)
        loadConversations()
      } catch (err) {
        alert(getErrorMessage(err, "Lỗi khi chuyển ticket"))
      } finally {
        setIsConverting(false)
      }
    }
  }

  // Handle go phim thi emit staff_typing
  const handleInputChange = (e) => {
    setInputText(e.target.value)
    if (socketRef.current && selectedConv) {
      socketRef.current.emit('staff_typing', {
        conversation_id: getId(selectedConv),
        is_typing: e.target.value.length > 0,
      })
    }
  }

  return (
    <DashboardLayout title='Trò chuyện trực tuyến với khách hàng' description='Staff trực hỗ trợ, giải đáp thắc mắc của khách hàng theo thời gian thực.'>
      {/* Toast thông báo trong app */}
      <InAppToast toasts={toasts} onRemove={removeToast} />
      <Alert type='danger'>{error}</Alert>

      <Row className='g-4' style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
        {/* Cột danh sách hội thoại bên trái */}
        <Col lg={4} className='h-100'>
          <Card className='card-surface h-100 overflow-hidden' style={{ display: 'flex', flexDirection: 'column' }}>
            <Card.Header className='bg-white py-3 border-bottom border-slate-100'>
              <div className='flex justify-between items-center mb-2'>
                <h3 className='m-0 text-base font-black text-slate-900'>Danh sách chat</h3>
                <Button size='sm' variant='outline' onClick={loadConversations}>Làm mới</Button>
              </div>
              <Form.Control
                type='text'
                placeholder='Tìm khách hàng...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='!rounded-pill text-sm shadow-none'
              />
            </Card.Header>

            <div className='flex-1 overflow-y-auto p-2 d-flex flex-column gap-1 bg-slate-50' style={{ minHeight: 0 }}>
              {isLoadingList ? (
                <LoadingText />
              ) : conversations.length === 0 ? (
                <div className='text-center py-5 text-sm text-slate-400'>Chưa có cuộc hội thoại nào được phân công.</div>
              ) : (
                conversations
                  .filter(conv => 
                    conv.customer_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    conv.customer_id?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((conv) => {
                  const isSelected = selectedConv && getId(conv) === getId(selectedConv)
                  return (
                    <div
                      key={getId(conv)}
                      onClick={() => setSelectedConv(conv)}
                      className={`p-3 !rounded-4 cursor-pointer transition ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 border border-slate-100'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className='flex justify-between items-start mb-1'>
                        <h4 className={`text-sm font-black m-0 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {conv.customer_id?.name || 'Khách hàng'}
                        </h4>
                        <span className={`text-[9px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {formatDate(conv.updated_at || conv.created_at)}
                        </span>
                      </div>
                      <p className={`text-xs m-0 text-truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {conv.customer_id?.email}
                      </p>
                      <div className='mt-2 flex justify-between items-center'>
                        <span className={`text-[10px] px-2 py-0.5 !rounded-pill font-bold ${
                          conv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {conv.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                        
                        {unreadCounts[getId(conv)] > 0 && (
                          <span className='bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 !rounded-pill shadow-sm'>
                            {unreadCounts[getId(conv)]} tin mới
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </Col>

        {/* Cột khung chat bên phải */}
        <Col lg={8} className='h-100'>
          <Card className='card-surface h-100 overflow-hidden' style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedConv ? (
              <>
                {/* Header của khung chat */}
                <Card.Header className='bg-white py-3 border-bottom border-slate-100 flex justify-between items-center'>
                  <div className='flex items-center gap-2'>
                    <div className='relative'>
                      <span className='text-2xl'>👤</span>
                      {/* Hiển thị cơ bản trạng thái online khi connect socket */}
                      <span className='absolute bottom-0 right-0 block h-2.5 w-2.5 !rounded-full bg-green-500 ring-2 ring-white'></span>
                    </div>
                    <div>
                      <h4 className='m-0 text-sm font-black text-slate-900'>
                        {selectedConv.customer_id?.name || 'Khách hàng'}
                      </h4>
                      <p className='m-0 text-[10px] text-green-600 font-bold'>Trực tuyến (phòng trò chuyện đang hoạt động)</p>
                    </div>
                  </div>
                  {selectedConv.status !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={handleConvertToTicket} disabled={isConverting}>
                      {isConverting ? 'Đang chuyển...' : 'Chuyển thành Ticket'}
                    </Button>
                  )}
                </Card.Header>

                {/* Nội dung tin nhắn */}
                <div className='flex-1 p-4 overflow-y-auto bg-slate-50 d-flex flex-column gap-3' style={{ minHeight: 0 }}>
                  {chatError && <Alert type='danger'>{chatError}</Alert>}
                  {isLoadingChat ? (
                    <LoadingText />
                  ) : messages.length === 0 ? (
                    <div className='text-center py-5 text-sm text-slate-400'>Chưa có tin nhắn nào trong phòng này.</div>
                  ) : (
                    messages.map((msg, index) => {
                      const myId = user._id || user.id || user.user_id
                      const isMe = String(msg.sender_id?._id || msg.sender_id) === String(myId)
                      return (
                        <div key={msg._id || index} className={`flex flex-column ${isMe ? 'items-end align-items-end' : 'items-start align-items-start'}`}>
                          <div className={`!rounded-4 px-3 py-2 text-sm max-w-[75%] ${
                            isMe ? 'bg-orange-500 text-white !rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 !rounded-bl-none'
                          }`} style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', wordBreak: 'break-word' }}>
                            {msg.message}
                            <MessageAttachments attachments={msg.attachments || []} isMine={isMe} />
                          </div>
                          <div className={`flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span>{msg.sender_id?.name || (isMe ? 'Bạn' : 'Khách hàng')}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  {isCustomerTyping && (
                    <div className='flex items-start'>
                      <div className='bg-slate-200 text-slate-600 !rounded-4 px-3 py-2 text-xs italic !rounded-bl-none'>
                        Khách hàng đang gõ phím...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Nhập tin nhắn */}
                <Card.Footer className='bg-white p-3 border-top border-slate-100'>
                  <form onSubmit={handleSend}>
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
                    <div className='d-flex gap-2 align-items-center'>
                      <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        className='d-flex align-items-center justify-content-center !rounded-circle border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                        style={{ width: 40, height: 40, minWidth: 40 }}
                        title='Đính kèm ảnh/file'
                      >
                        <i className='bi bi-paperclip fs-5' />
                      </button>
                      <Form.Control
                        type='text'
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder='Nhập nội dung hỗ trợ khách hàng...'
                        className='!rounded-pill px-4 shadow-none'
                        disabled={isLoadingChat || isUploading}
                      />
                      <Button type='submit' disabled={isLoadingChat || isUploading || (!inputText.trim() && selectedFiles.length === 0)}>
                        {isUploading ? 'Đang gửi...' : 'Gửi'}
                      </Button>
                    </div>
                  </form>
                </Card.Footer>
              </>
            ) : (
              <div className='h-100 flex flex-column items-center justify-center p-5 text-slate-400 bg-slate-50'>
                <span className='text-5xl mb-3'>💬</span>
                <h4 className='text-lg font-black text-slate-800 mb-1'>Hộp thoại Hỗ Trợ Khách Hàng</h4>
                <p className='text-sm text-center max-w-sm'>Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin trực tuyến.</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  )
}

export default ChatManagementPage

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, getCurrentUser, getUserRole } from '../../utils/authStorage'
import api, { API_BASE_URL, getErrorMessage } from '../../services/api'
import { formatCurrency, getId } from '../../utils/format'
import MessageAttachments from '../../components/molecules/MessageAttachments'

// ---- Toast notification đơn giản ----
function Toast({ toasts, onRemove }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 100,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => {
            if (t.type === 'ticket') {
              window.location.href = '/support'
            } else {
              // Mở chat
              const chatBtn = document.getElementById('chat-widget-trigger')
              if (chatBtn) chatBtn.click()
            }
            onRemove(t.id)
          }}
          style={{
            pointerEvents: 'auto',
            background: t.type === 'ticket' 
              ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' 
              : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#fff',
            borderRadius: 14,
            padding: '10px 16px',
            boxShadow: t.type === 'ticket'
              ? '0 4px 20px rgba(59,130,246,0.4)'
              : '0 4px 20px rgba(249,115,22,0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            minWidth: 260,
            maxWidth: 340,
            cursor: 'pointer',
            animation: 'chatToastIn 0.35s cubic-bezier(.21,1.02,.73,1) both',
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>{t.type === 'ticket' ? '🎫' : '🎧'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
              {t.type === 'ticket' ? 'Thông báo Ticket' : 'Nhân viên hỗ trợ'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.92, wordBreak: 'break-word', lineHeight: 1.4 }}>{t.text}</div>
          </div>
          <span style={{ opacity: 0.7, fontSize: 16, alignSelf: 'center', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onRemove(t.id) }}>×</span>
        </div>
      ))}
    </div>
  )
}

// Tạo âm thanh thông báo
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const play = (freq, start, duration) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start)
      gain.gain.setValueAtTime(0, audioCtx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + start + 0.01)
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + start + duration)
      osc.start(audioCtx.currentTime + start)
      osc.stop(audioCtx.currentTime + start + duration)
    }
    play(880, 0, 0.12)
    play(1100, 0.15, 0.12)
  } catch (e) {}
}

let toastIdCounter = 0

function ChatWidget() {
  const user = getCurrentUser()
  const token = getAccessToken()
  const role = getUserRole(user)

  // Chi hien thi floating chat bong bong neu user la Customer va da login
  if (!user || role !== 'CUSTOMER') {
    return null
  }

  const [isOpen, setIsOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isStaffTyping, setIsStaffTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState([])

  const [activeTab, setActiveTab] = useState('chat')
  const [tickets, setTickets] = useState([])

  const socketRef = useRef(null)
  const chatEndRef = useRef(null)
  const isOpenRef = useRef(isOpen)

  // Đồng bộ ref với state để dùng trong callback closure
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // Thêm toast
  const addToast = (text, type = 'chat') => {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  // Cuon xuong tin nhan cuoi cung
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStaffTyping])

  // Khi mở chat box thì reset unread
  const handleOpen = () => {
    setIsOpen(true)
    setUnreadCount(0)
    setToasts([])
  }

  // Nap cuoc hoi thoai hien tai va ket noi Socket (1 lần hoặc khi mở chat nếu chưa có)
  useEffect(() => {
    // Nếu socket đã kết nối rồi thì không tải lại dữ liệu nữa (đã có realtime)
    if (socketRef.current) return

    let active = true

    const startChat = async () => {
      try {
        setIsLoading(true)
        setError('')

        // 1. Lay danh sach cuoc hoi thoai hien tai
        const res = await api.get('/chat/conversations')
        const list = res.data?.data || []

        let activeConv = list.find((c) => c.status === 'open') || list[0]

        // 2. Neu chua co cuoc hoi thoai open, va nguoi dung MO chat, thi moi tao
        if (!activeConv && isOpen) {
          const createRes = await api.post('/chat/conversations')
          activeConv = createRes.data?.data
        }

        if (!active) return

        if (activeConv) {
          setConversation(activeConv)

          // 3. Lay lich su tin nhan
          const msgRes = await api.get(`/chat/conversations/${getId(activeConv)}/messages`)
          if (active) {
            setMessages(msgRes.data?.data?.messages || [])
          }

          // 4. Ket noi Socket IO real-time
          if (!socketRef.current) {
            const socket = io(API_BASE_URL, {
              auth: { token },
            })
            socketRef.current = socket

            // Join vao room chat
            socket.emit('join_conversation', { conversation_id: getId(activeConv) })

            // Lang nghe tin nhan moi
            socket.on('receive_message', (msg) => {
              const myId = user.user_id || user._id || user.id
              const isFromMe = String(msg.sender_id?._id || msg.sender_id) === String(myId)

              setMessages((prev) => {
                // Tránh duplicate
                if (prev.find((m) => String(m._id) === String(msg._id))) return prev
                return [...prev, msg]
              })

              // Nếu tin nhắn từ nhân viên và chat đang đóng → thông báo
              if (!isFromMe) {
                if (!isOpenRef.current) {
                  setUnreadCount((c) => c + 1)
                  playNotificationSound()
                  addToast(msg.message || 'Nhân viên đã gửi một tệp đính kèm', 'chat')
                  // Browser notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    const notif = new Notification('Trò chuyện hỗ trợ', {
                      body: msg.message || 'Nhân viên đã gửi một tệp đính kèm',
                      icon: '/vite.svg',
                    })
                    notif.onclick = () => {
                      const chatBtn = document.getElementById('chat-widget-trigger')
                      if (chatBtn) chatBtn.click()
                      window.focus()
                    }
                  }
                }
              }
            })

            // Lang nghe trang thai typing tu staff
            socket.on('staff_typing', ({ is_typing }) => {
              setIsStaffTyping(is_typing)
            })

            // Lắng nghe phản hồi Ticket
            socket.on('customer_receive_ticket_message', (payload) => {
              playNotificationSound()
              addToast('Phản hồi mới cho Ticket hỗ trợ của bạn!', 'ticket')
              // Force reload tickets list if in ticket tab
              if (isOpenRef.current) {
                api.get('/support/tickets').then(res => setTickets(res.data?.data || [])).catch(()=>{})
              }
              if ('Notification' in window && Notification.permission === 'granted') {
                const notif = new Notification('Phản hồi Ticket Hỗ Trợ', {
                  body: payload.message?.message || 'Nhân viên vừa trả lời ticket của bạn',
                  icon: '/vite.svg',
                })
                notif.onclick = () => {
                  window.location.href = '/support'
                }
              }
            })

            // Yêu cầu quyền notification nếu chưa có
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission()
            }
          }
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, 'Không thể kết nối trò chuyện hỗ trợ.'))
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    startChat()

    return () => {
      active = false
    }
  }, [isOpen, token])

  // Dọn dẹp kết nối socket khi unmount khỏi app
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // Load danh sách Ticket khi mở sang tab Ticket
  useEffect(() => {
    if (isOpen && activeTab === 'ticket' && tickets.length === 0) {
      api.get('/support/tickets')
         .then(res => setTickets(res.data?.data || []))
         .catch(err => console.error(err))
    }
  }, [isOpen, activeTab])

  // Gui tin nhan
  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim() || !conversation || !socketRef.current) return

    // Emit event gui tin nhan qua socket
    socketRef.current.emit('send_message', {
      conversation_id: getId(conversation),
      message: inputText.trim(),
    })

    setInputText('')
  }

  return (
    <>
      {/* CSS animation */}
      <style>{`
        @keyframes chatToastIn {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes chatBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
      `}</style>

      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className='chat-widget-container' style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        {/* Nut bong bong chat noi */}
        {!isOpen && (
          <button
            id='chat-widget-trigger'
            onClick={handleOpen}
            title='Thông báo hỗ trợ'
            style={{
              width: 58, height: 58,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 4px 20px rgba(245,158,11,0.5)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.5)' }}
          >
            {/* Icon phong bì SVG */}
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="10" width="40" height="28" rx="4" fill="#fff9c4"/>
              <path d="M4 14l20 14L44 14" stroke="#f59e0b" strokeWidth="2.5" fill="none"/>
              <rect x="4" y="10" width="40" height="28" rx="4" stroke="#d97706" strokeWidth="2" fill="none"/>
              <path d="M4 38l14-12M44 38L30 26" stroke="#d97706" strokeWidth="1.5"/>
            </svg>

            {/* Badge unread */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 22,
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
                  padding: '0 4px',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Khung chatbox hien thi */}
        {isOpen && (
          <div
            className='card shadow-2xl !rounded-4 overflow-hidden bg-white border border-slate-100'
            style={{ width: 380, height: 520, display: 'flex', flexDirection: 'column' }}
          >
            {/* Header mới (Màu xanh, có 2 Tabs) */}
            <div style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              padding: '16px 18px 12px',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Thông báo hỗ trợ</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'chat', label: '💬 Chat', count: unreadCount },
                  { key: 'ticket', label: '🎫 Ticket', count: 0 },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 600, fontSize: 12,
                      background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                      color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        padding: '1px 6px', lineHeight: '16px',
                      }}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Khung hien thi TAB CHAT (Giữ nguyên Chat Box) */}
            {activeTab === 'chat' && (
              <>
                <div className='flex-1 p-3 overflow-y-auto bg-slate-50 d-flex flex-column gap-2' style={{ minHeight: 0 }}>
                  {error && <div className='alert alert-danger p-2 text-xs'>{error}</div>}
                  {isLoading ? (
                    <div className='text-center py-5 text-sm text-slate-400'>Đang kết nối...</div>
                  ) : messages.length === 0 ? (
                    <div className='text-center py-5 text-xs text-slate-400'>
                      Hãy gửi tin nhắn để bắt đầu trò chuyện với nhân viên bán hàng.
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const myId = user._id || user.id || user.user_id
                      const isMe = String(msg.sender_id?._id || msg.sender_id) === String(myId)
                      return (
                        <div key={msg._id || index} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                          <div
                            className={`!rounded-4 px-3 py-2 text-sm max-w-[85%] ${
                              isMe ? 'bg-orange-500 text-white !rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 !rounded-bl-none'
                            }`}
                            style={{ wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                          >
                            {msg.message}
                            <MessageAttachments attachments={msg.attachments || []} isMine={isMe} />
                          </div>
                          <div className={`text-[9px] text-slate-400 mt-1 px-1 d-flex gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span>{msg.sender_id?.name || (isMe ? 'Bạn' : 'Nhân viên')}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {isStaffTyping && (
                    <div className='d-flex align-items-start'>
                      <div className='bg-slate-200 text-slate-600 !rounded-4 px-3 py-2 text-xs italic !rounded-bl-none'>
                        Nhân viên đang nhập...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Khung input nhap tin nhan */}
                <form onSubmit={handleSend} className='p-2 border-top border-slate-100 bg-white flex gap-2 items-center'>
                  <input
                    type='text'
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder='Nhập tin nhắn...'
                    className='flex-1 border border-slate-200 !rounded-pill px-3 py-2 text-sm shadow-none focus:outline-none focus:border-orange-500'
                    disabled={isLoading}
                  />
                  <button
                    type='submit'
                    className='d-flex align-items-center justify-content-center bg-orange-500 text-white !rounded-full w-9 h-9 border-0 hover:bg-orange-600 transition'
                    style={{ cursor: 'pointer', minWidth: 36, minHeight: 36 }}
                    disabled={isLoading || !inputText.trim()}
                  >
                    ➔
                  </button>
                </form>
              </>
            )}

            {/* Khung hien thi TAB TICKET */}
            {activeTab === 'ticket' && (
              <div className='flex-1 overflow-y-auto bg-white d-flex flex-column'>
                <div className='flex-1 p-2'>
                  {(() => {
                    const activeTickets = tickets.filter(t => t.status !== 'closed');
                    if (activeTickets.length === 0) {
                      return <div className='text-center py-5 text-sm text-slate-400'>Bạn chưa có Ticket hỗ trợ nào đang mở.</div>
                    }
                    return activeTickets.map(t => (
                      <div key={t._id} className='p-3 mb-2 bg-slate-50 border border-slate-100 !rounded-3 hover:bg-slate-100 transition'
                           onClick={() => window.location.href = '/support'} style={{ cursor: 'pointer' }}>
                        <div className='d-flex justify-content-between align-items-start mb-1'>
                          <span className='font-bold text-sm text-slate-800 line-clamp-1'>{t.subject}</span>
                          <span className='text-[10px] text-slate-400 whitespace-nowrap ml-2'>
                            {new Date(t.updated_at || t.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className='d-flex justify-content-between align-items-center mt-2'>
                          <span className='text-xs text-slate-500'>Mã: #{String(t._id).substring(t._id.length - 6).toUpperCase()}</span>
                          <span className={`text-[10px] px-2 py-0.5 !rounded-pill font-bold ${
                            t.status === 'open' ? 'bg-blue-100 text-blue-700' :
                            (t.status === 'in_progress' || t.status === 'pending') ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {t.status === 'open' ? 'Đang mở' : (t.status === 'in_progress' || t.status === 'pending') ? 'Đang xử lý' : t.status === 'closed' ? 'Đã đóng' : t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
                <div className='p-3 text-center border-top border-slate-100 bg-slate-50'>
                  <a href="/support" className='text-blue-600 text-sm font-semibold text-decoration-none hover:underline'>
                    🎫 Xem trang quản lý Ticket
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default ChatWidget

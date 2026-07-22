import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, getCurrentUser, getUserRole, getUserId } from '../../utils/authStorage'
import api, { API_BASE_URL } from '../../services/api'
import { getId, pickArray } from '../../utils/format'
import { getTickets } from '../../services/support.service'

// ============================================================
// Helpers
// ============================================================
function timeAgo(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

function playNotifSound(type = 'chat') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = type === 'ticket'
      ? [[440, 0, 0.1], [550, 0.13, 0.1], [660, 0.26, 0.12], [880, 0.4, 0.18]]
      : [[660, 0, 0.08], [880, 0.11, 0.1]]
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type === 'ticket' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + start + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    })
  } catch (e) {}
}

// ============================================================
// StaffNotificationWidget
// ============================================================
function StaffNotificationWidget() {
  const user = getCurrentUser()
  const token = getAccessToken()
  const role = getUserRole(user)
  const myId = getUserId(user)
  const navigate = useNavigate()

  const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
  if (!user || !STAFF_ROLES.includes(role)) return null

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'ticket'

  // Chat notifications: { convId -> { conv, lastMsg, unread: bool, time } }
  const [chatItems, setChatItems] = useState({})
  // Ticket notifications: { ticketId -> { ticket, unread: bool, time } }
  const [ticketItems, setTicketItems] = useState({})

  const socketRef = useRef(null)
  const panelRef = useRef(null)
  const knownTicketIds = useRef(null)

  // Tổng số chưa đọc
  const chatUnread = Object.values(chatItems).filter(i => i.unread).length
  const ticketUnread = Object.values(ticketItems).filter(i => i.unread).length
  const totalUnread = chatUnread + ticketUnread

  // ---- Đóng panel khi click ngoài ----
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ---- Tải danh sách conversations ban đầu ----
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await api.get('/chat/conversations')
        const list = res.data?.data || []
        const map = {}
        list.forEach(conv => {
          map[getId(conv)] = {
            conv,
            lastMsg: conv.last_message || '',
            unread: false,
            time: conv.updated_at || conv.created_at,
          }
        })
        setChatItems(map)
      } catch (e) {}
    }
    loadConversations()
  }, [])

  // ---- Kết nối Socket cho chat real-time ----
  useEffect(() => {
    if (!token) return
    const socket = io(API_BASE_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('chat:joinStaffRoom')
    })

    socket.on('staff_receive_message', ({ conversationId, message }) => {
      // Bỏ qua tin nhắn do chính mình gửi
      if (String(message.sender_id?._id || message.sender_id) === String(myId)) return

      setChatItems(prev => {
        const existing = prev[conversationId] || {}
        return {
          ...prev,
          [conversationId]: {
            ...existing,
            conv: existing.conv || null,
            lastMsg: message.message || 'Đã gửi một tệp đính kèm',
            senderName: message.sender_id?.name || existing.conv?.customer_id?.name || 'Khách hàng',
            unread: true,
            time: new Date().toISOString(),
          }
        }
      })

      playNotifSound('chat')

      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = message.sender_id?.name || 'Khách hàng'
        new Notification(`Tin nhắn mới từ ${senderName}`, {
          body: message.message || 'Đã gửi một tệp đính kèm',
          icon: '/vite.svg',
          tag: `chat-${conversationId}`,
        })
      }
    })

    socket.on('staff_receive_ticket_message', ({ ticketId, message }) => {
      // Bỏ qua tin nhắn do chính nhân viên gửi
      if (String(message.sender_id?._id || message.sender_id) === String(myId)) return

      setTicketItems(prev => {
        const existing = prev[ticketId] || {}
        return {
          ...prev,
          [ticketId]: {
            ...existing,
            unread: true,
            time: new Date().toISOString()
          }
        }
      })

      playNotifSound('ticket')

      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = message.sender_id?.name || 'Khách hàng'
        new Notification(`Ticket phản hồi từ ${senderName}`, {
          body: message.message || 'Khách hàng vừa phản hồi ticket hỗ trợ',
          icon: '/vite.svg',
          tag: `ticket-${ticketId}`,
        })
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, myId])

  // ---- Polling tickets mỗi 30s ----
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const poll = async () => {
      try {
        const response = await getTickets()
        const data = pickArray(response, [])

        if (knownTicketIds.current === null) {
          // Lần đầu: khởi tạo baseline, đưa tất cả vào map nhưng không đánh dấu unread
          knownTicketIds.current = new Set(data.map(t => getId(t)))
          const map = {}
          data.forEach(t => {
            map[getId(t)] = {
              ticket: t,
              unread: false,
              time: t.updated_at || t.created_at,
            }
          })
          setTicketItems(map)
          return
        }

        let hasNew = false
        const newItems = {}

        data.forEach(t => {
          const tid = getId(t)
          if (!knownTicketIds.current.has(tid)) {
            // Ticket mới
            knownTicketIds.current.add(tid)
            newItems[tid] = { ticket: t, unread: true, time: t.created_at || new Date().toISOString() }
            hasNew = true
          } else {
            // Giữ nguyên trạng thái unread cũ
            newItems[tid] = { ticket: t, unread: false, time: t.updated_at || t.created_at }
          }
        })

        if (hasNew) {
          playNotifSound('ticket')
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Yêu cầu hỗ trợ mới!', {
              body: 'Có ticket hỗ trợ mới từ khách hàng.',
              icon: '/vite.svg',
              tag: 'new-ticket',
            })
          }
        }

        setTicketItems(prev => {
          const merged = {}
          data.forEach(t => {
            const tid = getId(t)
            merged[tid] = newItems[tid] || prev[tid] || { ticket: t, unread: false, time: t.updated_at || t.created_at }
            if (!newItems[tid]) merged[tid].ticket = t
          })
          return merged
        })
      } catch (e) {}
    }

    poll() // chạy ngay lần đầu
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [])

  // ---- Đánh dấu đã đọc khi click ----
  const handleChatClick = (convId) => {
    setChatItems(prev => ({
      ...prev,
      [convId]: { ...prev[convId], unread: false }
    }))
    setIsOpen(false)
    navigate('/staff/chat', { state: { conversationId: convId } })
  }

  const handleTicketClick = (ticketId) => {
    setTicketItems(prev => ({
      ...prev,
      [ticketId]: { ...prev[ticketId], unread: false }
    }))
    setIsOpen(false)
    navigate('/staff/support', { state: { ticketId: ticketId } })
  }

  const markAllRead = () => {
    if (activeTab === 'chat') {
      setChatItems(prev => {
        const next = {}
        Object.entries(prev).forEach(([k, v]) => { next[k] = { ...v, unread: false } })
        return next
      })
    } else {
      setTicketItems(prev => {
        const next = {}
        Object.entries(prev).forEach(([k, v]) => { next[k] = { ...v, unread: false } })
        return next
      })
    }
  }

  // Sắp xếp: unread lên trên, mới nhất trước
  const sortedChat = Object.entries(chatItems).sort(([, a], [, b]) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return new Date(b.time) - new Date(a.time)
  })
  const sortedTickets = Object.entries(ticketItems).sort(([, a], [, b]) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return new Date(b.time) - new Date(a.time)
  })

  // ---- Render ----
  return (
    <>
      <style>{`
        @keyframes snwBadgePulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          50% { transform: scale(1.2); box-shadow: 0 0 0 5px rgba(239,68,68,0); }
        }
        @keyframes snwPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes snwEnvelopeWiggle {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(5deg); }
        }
        .snw-item-unread {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
          border-left: 3px solid #3b82f6 !important;
        }
        .snw-item-unread:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
        }
        .snw-item-read {
          background: #ffffff;
          border-left: 3px solid transparent;
        }
        .snw-item-read:hover {
          background: #f8fafc;
        }
        .snw-ticket-unread {
          background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%) !important;
          border-left: 3px solid #8b5cf6 !important;
        }
        .snw-ticket-unread:hover {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%) !important;
        }
      `}</style>

      <div ref={panelRef} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000 }}>

        {/* ---- Nút icon phong bì ---- */}
        <button
          onClick={() => setIsOpen(o => !o)}
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
            animation: totalUnread > 0 ? 'snwEnvelopeWiggle 1.8s ease infinite' : 'none',
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

          {/* Badge số */}
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              minWidth: 22, height: 22,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
              padding: '0 4px',
              animation: 'snwBadgePulse 1.4s ease infinite',
            }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>

        {/* ---- Panel thông báo ---- */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            bottom: 70, right: 0,
            width: 380,
            maxHeight: 520,
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'snwPanelIn 0.3s cubic-bezier(.21,1.02,.73,1) both',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>

            {/* Header panel */}
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
                  { key: 'chat', label: '💬 Chat', count: chatUnread },
                  { key: 'ticket', label: '🎫 Ticket', count: ticketUnread },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
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
                        background: '#ef4444', color: '#fff',
                        borderRadius: 999, fontSize: 10, fontWeight: 700,
                        padding: '1px 6px', lineHeight: '16px',
                      }}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions bar */}
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc',
            }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                {activeTab === 'chat'
                  ? `${sortedChat.length} cuộc hội thoại`
                  : `${sortedTickets.length} ticket`}
              </span>
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: '#3b82f6', fontWeight: 600, padding: '2px 6px',
                }}
              >
                ✓ Đánh dấu tất cả đã đọc
              </button>
            </div>

            {/* Danh sách items */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ---- Tab Chat ---- */}
              {activeTab === 'chat' && (
                sortedChat.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                    <div style={{ fontSize: 13 }}>Chưa có cuộc hội thoại nào</div>
                  </div>
                ) : sortedChat.map(([convId, item]) => {
                  const name = item.senderName
                    || item.conv?.customer_id?.name
                    || 'Khách hàng'
                  const avatar = item.conv?.customer_id?.img_url || ''
                  return (
                    <div
                      key={convId}
                      onClick={() => handleChatClick(convId)}
                      className={item.unread ? 'snw-item-unread' : 'snw-item-read'}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: item.unread
                          ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                          : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: item.unread ? '#fff' : '#64748b',
                        overflow: 'hidden',
                      }}>
                        {avatar
                          ? <img src={avatar} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : name.charAt(0).toUpperCase()
                        }
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{
                            fontWeight: item.unread ? 700 : 500,
                            fontSize: 13,
                            color: item.unread ? '#1e40af' : '#374151',
                          }}>{name}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                            {timeAgo(item.time)}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: item.unread ? '#1e40af' : '#6b7280',
                          fontWeight: item.unread ? 600 : 400,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {item.lastMsg || 'Bắt đầu cuộc hội thoại'}
                        </div>
                      </div>

                      {/* Chấm xanh unread */}
                      {item.unread && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#3b82f6', flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </div>
                  )
                })
              )}

              {/* ---- Tab Ticket ---- */}
              {activeTab === 'ticket' && (
                sortedTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🎫</div>
                    <div style={{ fontSize: 13 }}>Chưa có ticket nào</div>
                  </div>
                ) : sortedTickets.map(([ticketId, item]) => {
                  const ticket = item.ticket
                  const statusColors = {
                    open: { bg: '#dcfce7', text: '#16a34a' },
                    pending: { bg: '#fef3c7', text: '#d97706' },
                    closed: { bg: '#f1f5f9', text: '#64748b' },
                  }
                  const sc = statusColors[ticket.status] || statusColors.closed
                  return (
                    <div
                      key={ticketId}
                      onClick={() => handleTicketClick(ticketId)}
                      className={item.unread ? 'snw-ticket-unread' : 'snw-item-read'}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: item.unread
                          ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
                          : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>
                        {item.unread ? '🆕' : '🎫'}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'flex-start', gap: 4 }}>
                          <span style={{
                            fontWeight: item.unread ? 700 : 500,
                            fontSize: 13,
                            color: item.unread ? '#6d28d9' : '#374151',
                            flex: 1, minWidth: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{ticket.subject || 'Yêu cầu hỗ trợ'}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                            {timeAgo(item.time)}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 11, color: '#6b7280', marginBottom: 5,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {ticket.user_id?.name || ticket.user_id?.email || 'Khách hàng'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            background: sc.bg, color: sc.text,
                            padding: '2px 8px', borderRadius: 999,
                          }}>
                            {ticket.status === 'open' ? 'Đang mở' : ticket.status === 'pending' ? 'Chờ xử lý' : 'Đã đóng'}
                          </span>
                          {ticket.category && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{ticket.category}</span>
                          )}
                        </div>
                      </div>

                      {/* Chấm tím unread */}
                      {item.unread && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#8b5cf6', flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex', gap: 8,
            }}>
              <button
                onClick={() => { navigate('/staff/chat'); setIsOpen(false) }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 10,
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff', color: '#2563eb',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                💬 Xem tất cả Chat
              </button>
              <button
                onClick={() => { navigate('/staff/support'); setIsOpen(false) }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 10,
                  border: '1px solid #ddd6fe',
                  background: '#faf5ff', color: '#7c3aed',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🎫 Xem tất cả Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default StaffNotificationWidget

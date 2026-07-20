import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, getCurrentUser, getUserRole } from '../../utils/authStorage'
import api, { API_BASE_URL, getErrorMessage } from '../../services/api'
import { formatCurrency, getId } from '../../utils/format'

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

  const socketRef = useRef(null)
  const chatEndRef = useRef(null)

  // Cuon xuong tin nhan cuoi cung
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStaffTyping])

  // Nap cuoc hoi thoai hien tai va ket noi Socket
  useEffect(() => {
    if (!isOpen) {
      // Ngat ket noi socket neu dong chat box
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    let active = true

    const startChat = async () => {
      try {
        setIsLoading(true)
        setError('')

        // 1. Lay danh sach cuoc hoi thoai hien tai
        const res = await api.get('/chat/conversations')
        const list = res.data?.data || []

        let activeConv = list.find((c) => c.status === 'open')

        // 2. Neu chua co cuoc hoi thoai open, tao moi tu dong assign
        if (!activeConv) {
          const createRes = await api.post('/chat/conversations')
          activeConv = createRes.data?.data
        }

        if (!active) return
        setConversation(activeConv)

        if (activeConv) {
          // 3. Lay lich su tin nhan
          const msgRes = await api.get(`/chat/conversations/${getId(activeConv)}/messages`)
          setMessages(msgRes.data?.data?.messages || [])

          // 4. Ket noi Socket IO real-time
          const socket = io(API_BASE_URL, {
            auth: { token },
          })
          socketRef.current = socket

          // Join vao room chat
          socket.emit('join_conversation', { conversation_id: getId(activeConv) })

          // Lang nghe tin nhan moi
          socket.on('receive_message', (msg) => {
            setMessages((prev) => [...prev, msg])
          })

          // Lang nghe trang thai typing tu staff
          socket.on('staff_typing', ({ is_typing }) => {
            setIsStaffTyping(is_typing)
          })
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
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isOpen, token])

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
    <div className='chat-widget-container' style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {/* Nut bong bong chat noi */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className='flex h-14 w-14 items-center justify-center !rounded-full bg-blue-600 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-blue-700'
          style={{ border: 'none', cursor: 'pointer' }}
          aria-label='Trò chuyện hỗ trợ'
        >
          <span className='text-2xl'>💬</span>
        </button>
      )}

      {/* Khung chatbox hien thi */}
      {isOpen && (
        <div
          className='card shadow-2xl !rounded-4 overflow-hidden bg-white border border-slate-100'
          style={{ width: 360, height: 460, display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div className='bg-blue-600 p-3 text-white flex justify-between items-center'>
            <div className='flex items-center gap-2'>
              <span className='text-lg'>🎧</span>
              <div>
                <h4 className='m-0 text-sm font-black'>Trò chuyện hỗ trợ trực tuyến</h4>
                <p className='m-0 text-[10px] opacity-75'>Nhân viên hỗ trợ sẽ phản hồi bạn sớm nhất.</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className='bg-transparent border-0 text-white opacity-80 hover:opacity-100 text-xl font-bold p-1 leading-none'
              style={{ cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          {/* Khung hien thi message */}
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
                const isMe = String(msg.sender_id?._id || msg.sender_id) === String(user.user_id)
                return (
                  <div key={msg._id || index} className={`flex flex-column ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`!rounded-4 px-3 py-2 text-sm max-w-[85%] ${
                        isMe ? 'bg-blue-600 text-white !rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 !rounded-bl-none'
                      }`}
                      style={{ wordBreak: 'break-word shadow-sm' }}
                    >
                      {msg.message}
                    </div>
                    <span className='text-[9px] text-slate-400 mt-1 px-1'>
                      {msg.sender_id?.name || (isMe ? 'Bạn' : 'Nhân viên')}
                    </span>
                  </div>
                )
              })
            )}

            {isStaffTyping && (
              <div className='flex items-start'>
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
              className='flex-1 border border-slate-200 !rounded-pill px-3 py-2 text-sm shadow-none focus:outline-none focus:border-blue-600'
              disabled={isLoading}
            />
            <button
              type='submit'
              className='flex items-center justify-center bg-blue-600 text-white !rounded-full w-9 h-9 border-0 hover:bg-blue-700'
              style={{ cursor: 'pointer' }}
              disabled={isLoading || !inputText.trim()}
            >
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ChatWidget

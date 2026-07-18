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

function ChatManagementPage() {
  const user = getCurrentUser()
  const token = getAccessToken()

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isCustomerTyping, setIsCustomerTyping] = useState(false)
  
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [chatError, setChatError] = useState('')

  const socketRef = useRef(null)
  const chatEndRef = useRef(null)

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
  }, [])

  // Ket noi socket va lay tin nhan khi chon mot cuoc hoi thoai
  useEffect(() => {
    if (!selectedConv) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

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

        // 2. Ket noi Socket IO
        const socket = io(API_BASE_URL, {
          auth: { token },
        })
        socketRef.current = socket

        // Join vao phong chat
        socket.emit('join_conversation', { conversation_id: getId(selectedConv) })

        // Lang nghe nhan tin nhan moi
        socket.on('receive_message', (msg) => {
          setMessages((prev) => [...prev, msg])
        })

        // Nhan event typing (mock hoac customer gui)
        socket.on('customer_typing', ({ is_typing }) => {
          setIsCustomerTyping(is_typing)
        })
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
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [selectedConv, token])

  // Gui tin nhan
  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedConv || !socketRef.current) return

    // Emit event gui tin nhan
    socketRef.current.emit('send_message', {
      conversation_id: getId(selectedConv),
      message: inputText.trim(),
    })

    // Emit ngung go phim
    socketRef.current.emit('staff_typing', {
      conversation_id: getId(selectedConv),
      is_typing: false,
    })

    setInputText('')
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
    <DashboardLayout title='Customer Live Chat' description='Staff trực hỗ trợ, giải đáp thắc mắc của khách hàng theo thời gian thực.'>
      <Alert type='danger'>{error}</Alert>

      <Row className='g-4' style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
        {/* Cột danh sách hội thoại bên trái */}
        <Col lg={4} className='h-100'>
          <Card className='card-surface h-100 overflow-hidden' style={{ display: 'flex', flexDirection: 'column' }}>
            <Card.Header className='bg-white py-3 border-bottom border-slate-100 flex justify-between items-center'>
              <h3 className='m-0 text-base font-black text-slate-900'>Danh sách chat</h3>
              <Button size='sm' variant='outline' onClick={loadConversations}>F5</Button>
            </Card.Header>

            <div className='flex-1 overflow-y-auto p-2 d-flex flex-column gap-1 bg-slate-50' style={{ minHeight: 0 }}>
              {isLoadingList ? (
                <LoadingText />
              ) : conversations.length === 0 ? (
                <div className='text-center py-5 text-sm text-slate-400'>Chưa có cuộc hội thoại nào được phân công.</div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConv && getId(conv) === getId(selectedConv)
                  return (
                    <div
                      key={getId(conv)}
                      onClick={() => setSelectedConv(conv)}
                      className={`p-3 rounded-4 cursor-pointer transition ${
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-pill font-bold ${
                          conv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {conv.status === 'open' ? 'Open' : 'Closed'}
                        </span>
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
                      <span className='absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white'></span>
                    </div>
                    <div>
                      <h4 className='m-0 text-sm font-black text-slate-900'>
                        {selectedConv.customer_id?.name || 'Khách hàng'}
                      </h4>
                      <p className='m-0 text-[10px] text-green-600 font-bold'>Online (Chat Room active)</p>
                    </div>
                  </div>
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
                      const isMe = String(msg.sender_id?._id || msg.sender_id) === String(user.user_id)
                      return (
                        <div key={msg._id || index} className={`flex flex-column ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-4 px-3 py-2 text-sm max-w-[75%] ${
                            isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                          }`} style={{ shadow: 'sm', wordBreak: 'break-word' }}>
                            {msg.message}
                          </div>
                          <span className='text-[9px] text-slate-400 mt-1 px-1'>
                            {msg.sender_id?.name || (isMe ? 'Bạn' : 'Khách hàng')}
                          </span>
                        </div>
                      )
                    })
                  )}
                  {isCustomerTyping && (
                    <div className='flex items-start'>
                      <div className='bg-slate-200 text-slate-600 rounded-4 px-3 py-2 text-xs italic rounded-bl-none'>
                        Khách hàng đang gõ phím...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Nhập tin nhắn */}
                <Card.Footer className='bg-white p-3 border-top border-slate-100'>
                  <form onSubmit={handleSend} className='flex gap-2'>
                    <Form.Control
                      type='text'
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder='Nhập nội dung hỗ trợ khách hàng...'
                      className='rounded-pill px-4 shadow-none'
                      disabled={isLoadingChat}
                    />
                    <Button type='submit' disabled={isLoadingChat || !inputText.trim()}>
                      Gửi
                    </Button>
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

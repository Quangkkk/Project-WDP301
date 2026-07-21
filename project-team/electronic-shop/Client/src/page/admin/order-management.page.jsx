import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Nav from 'react-bootstrap/Nav'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import StatusBadge from '../../components/atoms/StatusBadge'

import { getErrorMessage } from '../../services/api'
import { getOrders, updateOrder, cancelOrder } from '../../services/order.service'
import { confirmBankTransferPayment } from '../../services/payment.service'
import { formatDate, formatOrderCode, getId, pickArray } from '../../utils/format'
import { getProductImage } from '../../utils/product'

const orderStatusOptions = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function getPaymentMethodLabel(method) {
  const map = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng',
    zalopay: 'ZaloPay',
  }
  return map[method] || method || '-'
}

function OrderManagementPage() {
  const [orders, setOrders] = useState([])
  const [statusDraft, setStatusDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Filtering
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      setError('')
      const response = await getOrders()
      const data = pickArray(response, [])
      setOrders(data)
      setStatusDraft(
        Object.fromEntries(
          data.map((order) => [getId(order), order.status || 'pending']),
        ),
      )
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được orders'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async (orderId) => {
    const originalOrder = orders.find((o) => getId(o) === orderId)
    if (statusDraft[orderId] === 'cancelled' && originalOrder?.status !== 'cancelled') {
      setCancelOrderId(orderId)
      setShowCancelModal(true)
      return
    }

    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')
      await updateOrder(orderId, { status: statusDraft[orderId] })
      setMessage('Đã cập nhật trạng thái đơn hàng.')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được trạng thái'))
    } finally {
      setLoadingId('')
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn')
      return
    }
    try {
      setLoadingId(cancelOrderId)
      setError('')
      setMessage('')
      setShowCancelModal(false)
      await cancelOrder(cancelOrderId, cancelReason.trim())
      setMessage('Đã hủy đơn hàng và gửi email thông báo cho khách.')
      setCancelReason('')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không hủy được đơn hàng'))
    } finally {
      setLoadingId('')
    }
  }

  const handleConfirmBank = async (orderId) => {
    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')
      await confirmBankTransferPayment(orderId)
      setMessage('Đã xác nhận thanh toán chuyển khoản.')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không xác nhận được thanh toán chuyển khoản'))
    } finally {
      setLoadingId('')
    }
  }

  const openOrderDetails = (order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  // Lọc đơn hàng
  const filteredOrders = orders.filter((order) => {
    const searchMatch =
      order.order_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.receiver_phone?.includes(searchQuery)
      
    if (activeTab === 'all') return searchMatch
    return searchMatch && order.status === activeTab
  })

  return (
    <DashboardLayout
      title='Quản lý đơn hàng'
      description='Nhân viên và quản lý xử lý đơn hàng, cập nhật trạng thái và thanh toán.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface mb-4'>
        <Card.Body className='p-3'>
          <Form.Control
            type='text'
            placeholder='Tìm kiếm theo Mã đơn hàng, Tên khách hàng hoặc SĐT...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='!rounded-pill shadow-none'
          />
        </Card.Body>
        <Card.Footer className='bg-white p-0 border-top'>
          <Nav variant="tabs" className="border-0 px-3 pt-2" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav.Item>
              <Nav.Link eventKey="all" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'all' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Tất cả</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="pending" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'pending' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Chờ xác nhận</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="processing" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'processing' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Đang xử lý</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="shipping" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'shipping' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Đang giao</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="completed" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'completed' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Hoàn thành</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="cancelled" className={`border-0 border-bottom border-3 !rounded-0 ${activeTab === 'cancelled' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-500'}`}>Đã hủy</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Footer>
      </Card>

      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='p-3'>Mã Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th className='text-end p-3'>Cập nhật</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan='6' className='text-center py-5 text-slate-500'>Đang tải đơn hàng...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan='6' className='text-center py-5 text-slate-500'>Không tìm thấy đơn hàng nào phù hợp.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const id = getId(order)
                  const isBankTransfer = order.payment_method === 'bank_transfer'
                  const isPaid = order.payment_status === 'paid'

                  return (
                    <tr key={id}>
                      <td className='p-3'>
                        <button type="button" onClick={() => openOrderDetails(order)} className='bg-transparent border-0 p-0 text-start text-blue-600 hover:text-blue-800 transition'>
                          <b className="text-decoration-underline">{formatOrderCode(order)}</b>
                        </button>
                        <br />
                        <span className='text-xs text-slate-500'>
                          {formatDate(order.created_at)}
                        </span>
                      </td>

                      <td>
                        <span className='font-bold text-slate-900'>
                          {order.user_id?.name || order.receiver_name}
                        </span>
                        <br />
                        <span className='text-xs text-slate-500'>
                          {order.receiver_phone}
                        </span>
                      </td>

                      <td>
                        <PriceText
                          value={order.total_amount}
                          className='font-black text-orange-600'
                        />
                      </td>

                      <td>
                        <div className='d-flex flex-column gap-1 align-items-start'>
                          <span className='text-xs font-bold text-slate-600'>
                            {getPaymentMethodLabel(order.payment_method)}
                          </span>
                          <StatusBadge value={order.payment_status} />
                        </div>
                      </td>

                      <td>
                        <StatusBadge value={order.status} />
                      </td>

                      <td className='p-3'>
                        <div className='d-flex gap-2 justify-content-end align-items-center'>
                          <div style={{ width: 150 }}>
                            <Form.Select
                              value={statusDraft[id] || order.status}
                              onChange={(event) => setStatusDraft((prev) => ({ ...prev, [id]: event.target.value }))}
                              size="sm"
                              className="!rounded-pill shadow-none"
                            >
                              {orderStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </Form.Select>
                          </div>
                          <Button
                            size='sm'
                            onClick={() => handleSave(id)}
                            isLoading={loadingId === id}
                            className='!rounded-pill'
                          >
                            Lưu
                          </Button>

                          {isBankTransfer && !isPaid && (
                            <Button
                              size='sm'
                              variant='success'
                              className='!rounded-pill ms-1'
                              onClick={() => handleConfirmBank(id)}
                              isLoading={loadingId === id}
                              title="Xác nhận đã chuyển khoản"
                            >
                              <i className="bi bi-check-circle"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Cancel Order Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton className='border-0 pb-0'>
          <Modal.Title className='h5 font-black text-slate-900'>Xác nhận hủy đơn hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className='text-sm text-slate-600 mb-3'>
            Vui lòng nhập lý do hủy đơn (bắt buộc). Lý do này sẽ được lưu lại và gửi email thông báo cho khách hàng.
          </p>
          <Form.Group>
            <Form.Control
              as='textarea'
              rows={3}
              placeholder='Nhập lý do hủy...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className='shadow-none !rounded-3'
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className='border-0 pt-0'>
          <Button variant='light' onClick={() => setShowCancelModal(false)}>Đóng</Button>
          <Button variant='danger' onClick={handleConfirmCancel} disabled={!cancelReason.trim()}>
            Xác nhận Hủy
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Order Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        {selectedOrder && (
          <>
            <Modal.Header closeButton className='border-bottom'>
              <Modal.Title className='h5 font-black text-slate-900'>
                Chi tiết đơn hàng {formatOrderCode(selectedOrder)}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="font-bold text-slate-700">Thông tin người nhận</h6>
                  <p className="text-sm text-slate-600 mb-1">Tên: <b>{selectedOrder.receiver_name}</b></p>
                  <p className="text-sm text-slate-600 mb-1">SĐT: <b>{selectedOrder.receiver_phone}</b></p>
                  <p className="text-sm text-slate-600 mb-1">Địa chỉ: {selectedOrder.address_address_line}, {selectedOrder.address_ward}, {selectedOrder.address_district}, {selectedOrder.address_province}</p>
                </Col>
                <Col md={6}>
                  <h6 className="font-bold text-slate-700">Thông tin thanh toán</h6>
                  <p className="text-sm text-slate-600 mb-1">Phương thức: <b>{getPaymentMethodLabel(selectedOrder.payment_method)}</b></p>
                  <p className="text-sm text-slate-600 mb-1 d-flex align-items-center gap-2">
                    Trạng thái: <StatusBadge value={selectedOrder.payment_status} />
                  </p>
                  {selectedOrder.note && (
                    <p className="text-sm text-slate-600 mb-1 text-danger">Ghi chú: {selectedOrder.note}</p>
                  )}
                  {selectedOrder.cancel_reason && (
                    <p className="text-sm text-slate-600 mb-1 text-danger">Lý do hủy: {selectedOrder.cancel_reason}</p>
                  )}
                </Col>
              </Row>

              <h6 className="font-bold text-slate-700 mb-2">Danh sách sản phẩm</h6>
              <div className="border !rounded-3 overflow-hidden">
                <Table className="mb-0 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2">Sản phẩm</th>
                      <th className="p-2 text-center">SL</th>
                      <th className="p-2 text-end">Đơn giá</th>
                      <th className="p-2 text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.length > 0 ? (
                      selectedOrder.items.map((item, idx) => {
                        const product = item.product_id
                        const variant = item.variant_id
                        const pImage = item.image || getProductImage(product, variant)
                        
                        return (
                          <tr key={idx}>
                            <td className="p-2 d-flex gap-2 align-items-center">
                              <div className="border bg-white !rounded overflow-hidden flex-shrink-0" style={{ width: 40, height: 40 }}>
                                {pImage ? <img src={pImage} alt="img" className="w-100 h-100 object-fit-contain" /> : <i className="bi bi-box text-slate-300 d-flex justify-content-center align-items-center h-100"></i>}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{product?.name || 'Sản phẩm đã xóa'}</div>
                                {variant?.variant_value && <div className="text-xs text-slate-500">Phân loại: {variant.variant_value}</div>}
                              </div>
                            </td>
                            <td className="p-2 text-center align-middle">{item.quantity}</td>
                            <td className="p-2 text-end align-middle"><PriceText value={item.unit_price} /></td>
                            <td className="p-2 text-end align-middle font-bold text-orange-600"><PriceText value={item.subtotal} /></td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr><td colSpan="4" className="text-center py-3">Không tải được sản phẩm.</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
              <div className="mt-3 text-end d-flex flex-column gap-1">
                <div className="text-sm">Tạm tính: <PriceText value={selectedOrder.subtotal} /></div>
                {selectedOrder.coupon_code && (
                  <div className="text-sm text-green-600">Mã giảm giá ({selectedOrder.coupon_code}): <b>Đã áp dụng</b></div>
                )}
                <div className="text-lg font-black mt-2">Tổng thanh toán: <PriceText className="text-orange-600" value={selectedOrder.total_amount} /></div>
              </div>
            </Modal.Body>
          </>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default OrderManagementPage
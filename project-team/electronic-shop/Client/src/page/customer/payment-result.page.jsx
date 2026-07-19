import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { getErrorMessage } from '../../services/api'
import { getPaymentByOrder } from '../../services/payment.service'
import { getId } from '../../utils/format'

function getPaymentLabel(provider) {
  const map = {
    cod: 'Thanh toán khi nhận hàng',
    bank_transfer: 'Chuyển khoản ngân hàng',
    zalopay: 'ZaloPay Sandbox',
  }

  return map[provider] || provider || 'Thanh toán'
}

function getPaymentStatusLabel(status) {
  const map = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    cancelled: 'Đã hủy',
    expired: 'Hết hạn',
    refunded: 'Đã hoàn tiền',
  }

  return map[status] || status || 'Chờ thanh toán'
}

function getStatusClass(status) {
  if (status === 'paid') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'expired' ||
    status === 'refunded'
  ) {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-orange-50 text-orange-700'
}

function getOrderCode(order, orderId) {
  const id = getId(order) || orderId || ''
  return id ? `#${id.slice(-8).toUpperCase()}` : '-'
}

function getOrderAmount(order, payment) {
  return Number(
    payment?.amount ||
    order?.total_amount ||
    order?.totalAmount ||
    order?.total ||
    0,
  )
}

function PaymentResultPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [order, setOrder] = useState(location.state?.order || null)
  const [payment, setPayment] = useState(location.state?.payment || null)
  const [isLoading, setIsLoading] = useState(!location.state?.order)
  const [error, setError] = useState('')

  const provider = payment?.provider || order?.payment_method || 'cod'
  const status = payment?.status || order?.payment_status || 'pending'
  const amount = getOrderAmount(order, payment)

  const receiverAddress = useMemo(() => {
    if (!order) return ''

    return [
      order.address_address_line,
      order.address_ward,
      order.address_district,
      order.address_province,
    ]
      .filter(Boolean)
      .join(', ')
  }, [order])

  const loadPayment = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await getPaymentByOrder(orderId)
      const data = response?.data || {}

      setOrder(data.order || null)
      setPayment(data.payment || null)
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được thông tin thanh toán.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      loadPayment()
    }
  }, [orderId])

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : !order ? (
            <Row className='justify-content-center'>
              <Col lg={8}>
                <Card className='card-surface'>
                  <Card.Body className='p-5 text-center'>
                    <div className='mb-3 text-5xl'>⚠️</div>

                    <h1 className='mb-2 text-2xl font-black text-slate-950'>
                      Không tìm thấy đơn hàng
                    </h1>

                    <p className='mb-4 text-slate-500'>
                      Đơn hàng không tồn tại hoặc chưa có dữ liệu thanh toán.
                    </p>

                    <Button type='button' onClick={() => navigate('/orders')}>
                      Xem đơn hàng của tôi
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            <Row className='justify-content-center'>
              <Col lg={9} xl={8}>
                <Card className='card-surface overflow-hidden'>
                  <div
                    className='bg-orange-500'
                    style={{
                      height: 4,
                    }}
                  />

                  <Card.Body className='p-4 p-md-5'>
                    <div className='mb-4 d-flex flex-wrap align-items-start justify-content-between gap-3'>
                      <div>
                        <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                          Payment
                        </p>

                        <h1 className='mb-0 text-3xl font-black text-slate-950'>
                          Thông tin thanh toán
                        </h1>
                      </div>

                      <span
                        className={`!rounded-pill px-3 py-2 text-sm font-black ${getStatusClass(status)}`}
                      >
                        {getPaymentStatusLabel(status)}
                      </span>
                    </div>

                    <div className='mb-4 !rounded-4 border border-slate-200 bg-slate-50 p-4'>
                      <Row className='g-3'>
                        <Col md={6}>
                          <p className='mb-1 text-sm text-slate-500'>
                            Mã đơn hàng
                          </p>

                          <p className='mb-0 font-black text-slate-950'>
                            {getOrderCode(order, orderId)}
                          </p>
                        </Col>

                        <Col md={6}>
                          <p className='mb-1 text-sm text-slate-500'>
                            Phương thức
                          </p>

                          <p className='mb-0 font-black text-slate-950'>
                            {getPaymentLabel(provider)}
                          </p>
                        </Col>

                        <Col md={6}>
                          <p className='mb-1 text-sm text-slate-500'>
                            Số tiền
                          </p>

                          <PriceText
                            value={amount}
                            className='text-2xl font-black text-orange-600'
                          />
                        </Col>

                        <Col md={6}>
                          <p className='mb-1 text-sm text-slate-500'>
                            Người nhận
                          </p>

                          <p className='mb-0 font-bold text-slate-900'>
                            {order?.receiver_name || '-'} ·{' '}
                            {order?.receiver_phone || '-'}
                          </p>
                        </Col>

                        {receiverAddress && (
                          <Col xs={12}>
                            <p className='mb-1 text-sm text-slate-500'>
                              Địa chỉ giao hàng
                            </p>

                            <p className='mb-0 text-slate-700'>
                              {receiverAddress}
                            </p>
                          </Col>
                        )}
                      </Row>
                    </div>

                    {provider === 'bank_transfer' && (
                      <Row className='g-4 align-items-center'>
                        <Col md={5}>
                          <div className='!rounded-4 border border-orange-100 bg-white p-3 text-center shadow-sm'>
                            {payment?.qr_url ? (
                              <img
                                src={payment.qr_url}
                                alt='QR chuyển khoản'
                                className='img-fluid !rounded-3'
                              />
                            ) : (
                              <div className='py-5 text-slate-500'>
                                Chưa có mã QR
                              </div>
                            )}
                          </div>
                        </Col>

                        <Col md={7}>
                          <h2 className='mb-3 text-xl font-black text-slate-950'>
                            Quét mã để chuyển khoản
                          </h2>

                          <p className='mb-4 text-sm text-slate-500'>
                            Vui lòng chuyển khoản đúng số tiền và đúng nội dung
                            để đơn hàng được xác nhận nhanh hơn.
                          </p>

                          <div className='d-flex flex-column gap-3'>
                            <div>
                              <p className='mb-1 text-sm text-slate-500'>
                                Ngân hàng
                              </p>

                              <p className='mb-0 font-black text-slate-950'>
                                {payment?.bank_code || '-'}
                              </p>
                            </div>

                            <div>
                              <p className='mb-1 text-sm text-slate-500'>
                                Số tài khoản
                              </p>

                              <p className='mb-0 font-black text-slate-950'>
                                {payment?.account_no || '-'}
                              </p>
                            </div>

                            <div>
                              <p className='mb-1 text-sm text-slate-500'>
                                Tên tài khoản
                              </p>

                              <p className='mb-0 font-black text-slate-950'>
                                {payment?.account_name || '-'}
                              </p>
                            </div>

                            <div>
                              <p className='mb-1 text-sm text-slate-500'>
                                Nội dung chuyển khoản
                              </p>

                              <p className='mb-0 !rounded-3 bg-orange-50 px-3 py-2 font-black text-orange-700'>
                                {payment?.transfer_content ||
                                  payment?.payment_code ||
                                  '-'}
                              </p>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    )}

                    {provider === 'zalopay' &&
                      payment?.payment_url &&
                      status !== 'paid' && (
                        <div className='!rounded-4 border border-blue-100 bg-blue-50 p-4'>
                          <h2 className='mb-2 text-xl font-black text-slate-950'>
                            Tiếp tục thanh toán ZaloPay
                          </h2>

                          <p className='mb-3 text-slate-600'>
                            Đơn hàng đã được tạo. Bạn có thể bấm nút bên dưới
                            để mở lại cổng thanh toán ZaloPay Sandbox.
                          </p>

                          <Button
                            type='button'
                            onClick={() =>
                              window.open(payment.payment_url, '_blank', 'noopener,noreferrer')
                            }
                          >
                            Mở ZaloPay
                          </Button>
                        </div>
                      )}

                    {provider === 'zalopay' && status === 'paid' && (
                      <div className='!rounded-4 border border-emerald-100 bg-emerald-50 p-4'>
                        <h2 className='mb-2 text-xl font-black text-emerald-800'>
                          Thanh toán ZaloPay thành công
                        </h2>

                        <p className='mb-0 text-emerald-700'>
                          Đơn hàng của bạn đã được ghi nhận thanh toán.
                        </p>
                      </div>
                    )}

                    {provider === 'cod' && (
                      <div className='!rounded-4 border border-emerald-100 bg-emerald-50 p-4'>
                        <h2 className='mb-2 text-xl font-black text-emerald-800'>
                          Đặt hàng thành công
                        </h2>

                        <p className='mb-0 text-emerald-700'>
                          Bạn sẽ thanh toán khi nhận hàng. Nhân viên sẽ xử lý
                          đơn hàng trong thời gian sớm nhất.
                        </p>
                      </div>
                    )}

                    <div className='mt-4 d-flex flex-wrap gap-2'>
                      <Button type='button' onClick={() => navigate('/orders')}>
                        Xem đơn hàng
                      </Button>

                      <Button
                        type='button'
                        variant='secondary'
                        onClick={loadPayment}
                      >
                        Tải lại trạng thái
                      </Button>

                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() => navigate('/products')}
                      >
                        Tiếp tục mua hàng
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default PaymentResultPage
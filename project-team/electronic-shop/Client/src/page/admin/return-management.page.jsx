import { useEffect, useMemo, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Modal from 'react-bootstrap/Modal'
import Table from 'react-bootstrap/Table'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'

import { getErrorMessage } from '../../services/api'
import {
  getReturnRequests,
  reviewReturnRequest,
} from '../../services/order.service'
import {
  formatDate,
  formatOrderCode,
  getId,
  pickArray,
} from '../../utils/format'

const statusTabs = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'received', label: 'Đã nhận hàng' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

const reasonLabels = {
  damaged: 'Sản phẩm bị hư hỏng',
  wrong_item: 'Giao sai sản phẩm',
  not_as_described: 'Sản phẩm không đúng mô tả',
  missing_parts: 'Thiếu phụ kiện hoặc bộ phận',
  changed_mind: 'Không còn nhu cầu sử dụng',
  other: 'Lý do khác',
}

const statusLabels = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  received: 'Đã nhận hàng',
  refunded: 'Đã hoàn tiền',
}

const statusClasses = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  received: 'bg-blue-100 text-blue-700',
  refunded: 'bg-purple-100 text-purple-700',
}

function ReturnStatusBadge({ status }) {
  return (
    <span
      className={`!rounded-pill px-3 py-2 text-xs font-black ${
        statusClasses[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {statusLabels[status] || status || 'Không xác định'}
    </span>
  )
}

function getCustomerName(order) {
  return order?.user_id?.name || order?.receiver_name || 'Khách hàng'
}

function getCustomerContact(order) {
  return (
    order?.user_id?.email ||
    order?.receiver_email ||
    order?.receiver_phone ||
    '-'
  )
}

function getReturnItems(order) {
  return Array.isArray(order?.return_request?.items)
    ? order.return_request.items
    : []
}

function ReturnManagementPage() {
  const [requests, setRequests] = useState([])
  const [activeStatus, setActiveStatus] = useState('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingId, setLoadingId] = useState('')
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewDecision, setReviewDecision] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await getReturnRequests(
        activeStatus === 'all'
          ? {}
          : { status: activeStatus },
      )

      setRequests(pickArray(response, []))
    } catch (error) {
      setRequests([])
      setError(
        getErrorMessage(
          error,
          'Không tải được danh sách yêu cầu trả hàng.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [activeStatus])

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (order) => order?.return_request?.status === 'pending',
      ).length,
    [requests],
  )

  const handleOpenReviewModal = (order, decision) => {
    setReviewTarget(order)
    setReviewDecision(decision)
    setStaffNote('')
    setError('')
    setMessage('')
  }

  const handleCloseReviewModal = () => {
    if (loadingId) return

    setReviewTarget(null)
    setReviewDecision('')
    setStaffNote('')
  }

  const handleSubmitReview = async () => {
    const orderId = getId(reviewTarget)

    if (!orderId) {
      setError('Không tìm thấy đơn hàng cần xử lý.')
      return
    }

    if (reviewDecision === 'rejected' && !staffNote.trim()) {
      setError('Vui lòng nhập lý do từ chối yêu cầu trả hàng.')
      return
    }

    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')

      await reviewReturnRequest(orderId, {
        decision: reviewDecision,
        staff_note: staffNote.trim() || undefined,
      })

      setReviewTarget(null)
      setReviewDecision('')
      setStaffNote('')
      setMessage(
        reviewDecision === 'approved'
          ? 'Đã duyệt yêu cầu trả hàng.'
          : 'Đã từ chối yêu cầu trả hàng.',
      )

      await loadRequests()
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          'Không xử lý được yêu cầu trả hàng.',
        ),
      )
    } finally {
      setLoadingId('')
    }
  }

  const modalItems = getReturnItems(reviewTarget)

  return (
    <DashboardLayout
      title='Duyệt trả hàng'
      description='STAFF kiểm tra và duyệt hoặc từ chối yêu cầu trả hàng của customer.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <div className='mb-4 d-flex flex-wrap gap-2'>
        {statusTabs.map((tab) => {
          const isActive = activeStatus === tab.value

          return (
            <button
              key={tab.value}
              type='button'
              onClick={() => setActiveStatus(tab.value)}
              className={`!rounded-pill border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {tab.label}

              {tab.value === 'pending' && activeStatus === 'pending' && (
                <span className='ms-2 !rounded-pill bg-white px-2 py-1 text-xs text-blue-600'>
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <LoadingText />
      ) : requests.length === 0 ? (
        <EmptyState
          icon='↩️'
          title='Không có yêu cầu trả hàng'
          description='Không có yêu cầu nào trong trạng thái đang chọn.'
        />
      ) : (
        <Card className='card-surface overflow-hidden'>
          <Card.Body className='p-0'>
            <Table responsive hover className='mb-0 align-middle'>
              <thead>
                <tr>
                  <th className='p-3'>Đơn hàng</th>
                  <th>Customer</th>
                  <th style={{ minWidth: 280 }}>Sản phẩm trả</th>
                  <th style={{ minWidth: 210 }}>Lý do</th>
                  <th>Trạng thái</th>
                  <th style={{ minWidth: 190 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((order) => {
                  const orderId = getId(order)
                  const returnRequest = order.return_request || {}
                  const returnItems = getReturnItems(order)
                  const isPending = returnRequest.status === 'pending'

                  return (
                    <tr key={orderId}>
                      <td className='p-3'>
                        <b className='text-orange-600'>
                          {formatOrderCode(order)}
                        </b>
                        <br />
                        <span className='text-sm text-slate-500'>
                          Gửi ngày {formatDate(returnRequest.requested_at)}
                        </span>
                      </td>

                      <td>
                        <span className='font-bold text-slate-900'>
                          {getCustomerName(order)}
                        </span>
                        <br />
                        <span className='text-sm text-slate-500'>
                          {getCustomerContact(order)}
                        </span>
                      </td>

                      <td>
                        <div className='d-flex flex-column gap-2'>
                          {returnItems.map((item) => (
                            <div
                              key={String(item.order_item_id)}
                              className='text-sm'
                            >
                              <b>{item.product_name}</b>
                              {item.variant_value
                                ? ` - ${item.variant_value}`
                                : ''}
                              <span className='ms-2 text-orange-600'>
                                x {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td>
                        <p className='mb-1 font-semibold text-slate-800'>
                          {reasonLabels[returnRequest.reason] ||
                            returnRequest.reason ||
                            '-'}
                        </p>

                        {returnRequest.description && (
                          <p className='mb-0 text-sm text-slate-500'>
                            {returnRequest.description}
                          </p>
                        )}
                      </td>

                      <td>
                        <ReturnStatusBadge status={returnRequest.status} />

                        {returnRequest.staff_note && (
                          <p className='mb-0 mt-2 text-xs text-slate-500'>
                            {returnRequest.staff_note}
                          </p>
                        )}
                      </td>

                      <td>
                        {isPending ? (
                          <div className='d-flex flex-wrap gap-2'>
                            <Button
                              type='button'
                              size='sm'
                              variant='success'
                              onClick={() =>
                                handleOpenReviewModal(order, 'approved')
                              }
                              isLoading={loadingId === orderId}
                            >
                              Duyệt
                            </Button>

                            <Button
                              type='button'
                              size='sm'
                              variant='danger'
                              onClick={() =>
                                handleOpenReviewModal(order, 'rejected')
                              }
                              isLoading={loadingId === orderId}
                            >
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span className='text-sm text-slate-400'>
                            Đã xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <Modal
        show={Boolean(reviewTarget)}
        onHide={handleCloseReviewModal}
        centered
        backdrop={loadingId ? 'static' : true}
        keyboard={!loadingId}
      >
        <Modal.Header className='border-bottom px-4 py-3'>
          <Modal.Title className='text-xl font-black text-slate-950'>
            {reviewDecision === 'approved'
              ? 'Duyệt yêu cầu trả hàng'
              : 'Từ chối yêu cầu trả hàng'}
          </Modal.Title>

          <button
            type='button'
            onClick={handleCloseReviewModal}
            disabled={Boolean(loadingId)}
            className='ms-auto border-0 bg-transparent text-3xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50'
            aria-label='Đóng'
          >
            ×
          </button>
        </Modal.Header>

        <Modal.Body className='p-4'>
          <Alert type='danger'>{error}</Alert>

          {reviewTarget && (
            <div className='mb-4 !rounded-4 border border-slate-200 bg-slate-50 p-3'>
              <p className='mb-2 font-black text-orange-600'>
                {formatOrderCode(reviewTarget)}
              </p>

              {modalItems.map((item) => (
                <p key={String(item.order_item_id)} className='mb-1 text-sm'>
                  {item.product_name}
                  {item.variant_value ? ` - ${item.variant_value}` : ''}
                  {' × '}
                  {item.quantity}
                </p>
              ))}
            </div>
          )}

          <label
            htmlFor='staff-return-note'
            className='mb-2 d-block font-bold text-slate-800'
          >
            {reviewDecision === 'approved'
              ? 'Hướng dẫn gửi hàng về shop'
              : 'Lý do từ chối'}
            {reviewDecision === 'rejected' && (
              <span className='ms-1 text-red-500'>*</span>
            )}
          </label>

          <textarea
            id='staff-return-note'
            rows='5'
            maxLength='1000'
            value={staffNote}
            onChange={(event) => setStaffNote(event.target.value)}
            disabled={Boolean(loadingId)}
            placeholder={
              reviewDecision === 'approved'
                ? 'Ví dụ: Đóng gói sản phẩm và gửi về địa chỉ kho...'
                : 'Nhập lý do không chấp nhận yêu cầu trả hàng...'
            }
            className='form-control !rounded-4 border-slate-200 px-3 py-3 shadow-none focus:border-blue-400 focus:ring-0'
          />
        </Modal.Body>

        <Modal.Footer className='border-top px-4 py-3'>
          <Button
            type='button'
            variant='secondary'
            onClick={handleCloseReviewModal}
            disabled={Boolean(loadingId)}
          >
            Đóng
          </Button>

          <Button
            type='button'
            variant={reviewDecision === 'approved' ? 'success' : 'danger'}
            onClick={handleSubmitReview}
            isLoading={Boolean(loadingId)}
          >
            {reviewDecision === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default ReturnManagementPage

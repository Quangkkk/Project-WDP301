import { useEffect, useMemo, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Modal from 'react-bootstrap/Modal'
import Table from 'react-bootstrap/Table'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import DashboardLayout from '../../components/templates/DashboardLayout'

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

const twoLineTextStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

function ReturnStatusBadge({ status }) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        whitespace-nowrap rounded-full px-3 py-1.5
        text-xs font-black
        ${statusClasses[status] || 'bg-slate-100 text-slate-600'}
      `}
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

  const [detailTarget, setDetailTarget] = useState(null)
  const [reviewDecision, setReviewDecision] = useState('')
  const [staffNote, setStaffNote] = useState('')

  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [message, setMessage] = useState('')

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await getReturnRequests(
        activeStatus === 'all'
          ? {}
          : {
              status: activeStatus,
            },
      )

      setRequests(pickArray(response, []))
    } catch (loadError) {
      setRequests([])

      setError(
        getErrorMessage(
          loadError,
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

  const handleOpenDetailModal = (order) => {
    setDetailTarget(order)
    setReviewDecision('')
    setStaffNote('')
    setModalError('')
  }

  const handleCloseDetailModal = () => {
    if (loadingId) return

    setDetailTarget(null)
    setReviewDecision('')
    setStaffNote('')
    setModalError('')
  }

  const handleSelectDecision = (decision) => {
    setReviewDecision(decision)
    setStaffNote('')
    setModalError('')
  }

  const handleBackToDetail = () => {
    if (loadingId) return

    setReviewDecision('')
    setStaffNote('')
    setModalError('')
  }

  const handleSubmitReview = async () => {
    const orderId = getId(detailTarget)

    if (!orderId) {
      setModalError('Không tìm thấy đơn hàng cần xử lý.')
      return
    }

    if (!['approved', 'rejected'].includes(reviewDecision)) {
      setModalError('Vui lòng chọn thao tác xử lý yêu cầu.')
      return
    }

    if (reviewDecision === 'rejected' && !staffNote.trim()) {
      setModalError('Vui lòng nhập lý do từ chối yêu cầu trả hàng.')
      return
    }

    const confirmMessage =
      reviewDecision === 'approved'
        ? 'Bạn có chắc chắn muốn duyệt yêu cầu trả hàng này không?'
        : 'Bạn có chắc chắn muốn từ chối yêu cầu trả hàng này không?'

    const isConfirmed = window.confirm(confirmMessage)

    if (!isConfirmed) {
      return
    }

    try {
      setLoadingId(orderId)
      setModalError('')
      setMessage('')

      await reviewReturnRequest(orderId, {
        decision: reviewDecision,
        staff_note: staffNote.trim() || undefined,
      })

      setDetailTarget(null)
      setReviewDecision('')
      setStaffNote('')

      setMessage(
        reviewDecision === 'approved'
          ? 'Đã duyệt yêu cầu trả hàng thành công.'
          : 'Đã từ chối yêu cầu trả hàng thành công.',
      )

      await loadRequests()
    } catch (reviewError) {
      setModalError(
        getErrorMessage(
          reviewError,
          'Không xử lý được yêu cầu trả hàng.',
        ),
      )
    } finally {
      setLoadingId('')
    }
  }

  const detailRequest = detailTarget?.return_request || {}
  const detailItems = getReturnItems(detailTarget)
  const isDetailPending = detailRequest.status === 'pending'

  return (
    <DashboardLayout
      title='Duyệt trả hàng'
      description='Kiểm tra và xử lý các yêu cầu trả hàng của khách hàng.'
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
              className={`
                !rounded-full border px-4 py-2
                text-sm font-bold transition
                ${
                  isActive
                    ? `
                      border-orange-500 bg-orange-500
                      text-white
                    `
                    : `
                      border-slate-200 bg-white text-slate-600
                      hover:border-orange-300 hover:bg-orange-50
                      hover:text-orange-600
                    `
                }
              `}
            >
              {tab.label}

              {tab.value === 'pending' &&
                activeStatus === 'pending' && (
                  <span
                    className={`
                      ms-2 inline-flex h-6 min-w-6
                      items-center justify-center rounded-full
                      bg-white px-1.5 text-xs text-orange-600
                    `}
                  >
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
            <div className='w-full overflow-hidden'>
              <Table
                hover
                className='mb-0 align-middle'
                style={{
                  tableLayout: 'fixed',
                  width: '100%',
                }}
              >
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '21%' }} />
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>

                <thead>
                  <tr>
                    <th className='border-bottom px-3 py-3'>
                      Đơn hàng
                    </th>

                    <th className='border-bottom px-3 py-3'>
                      Khách hàng
                    </th>

                    <th className='border-bottom px-3 py-3'>
                      Sản phẩm trả
                    </th>

                    <th className='border-bottom px-3 py-3'>
                      Lý do
                    </th>

                    <th className='border-bottom px-3 py-3 text-center'>
                      Trạng thái
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((order) => {
                    const orderId = getId(order)
                    const returnRequest = order.return_request || {}
                    const returnItems = getReturnItems(order)

                    const displayedItems = returnItems.slice(0, 2)
                    const remainingItems =
                      returnItems.length - displayedItems.length

                    return (
                      <tr
                        key={orderId}
                        role='button'
                        tabIndex={0}
                        title='Bấm để xem chi tiết yêu cầu trả hàng'
                        onClick={() => handleOpenDetailModal(order)}
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' ||
                            event.key === ' '
                          ) {
                            event.preventDefault()
                            handleOpenDetailModal(order)
                          }
                        }}
                        className='cursor-pointer'
                      >
                        <td className='overflow-hidden px-3 py-3'>
                          <b
                            className={`
                              d-block text-truncate
                              font-black text-orange-600
                            `}
                            title={formatOrderCode(order)}
                          >
                            {formatOrderCode(order)}
                          </b>

                          <span
                            className={`
                              mt-1 d-block text-xs
                              text-slate-500
                            `}
                          >
                            {formatDate(returnRequest.requested_at)}
                          </span>
                        </td>

                        <td className='overflow-hidden px-3 py-3'>
                          <span
                            className={`
                              d-block text-truncate
                              font-bold text-slate-900
                            `}
                            title={getCustomerName(order)}
                          >
                            {getCustomerName(order)}
                          </span>

                          <span
                            className={`
                              mt-1 d-block text-truncate
                              text-sm text-slate-500
                            `}
                            title={getCustomerContact(order)}
                          >
                            {getCustomerContact(order)}
                          </span>
                        </td>

                        <td className='overflow-hidden px-3 py-3'>
                          <div className='d-flex flex-column gap-1'>
                            {displayedItems.map((item, index) => (
                              <div
                                key={String(
                                  item.order_item_id ||
                                    `${item.product_name}-${index}`,
                                )}
                                className='overflow-hidden text-sm'
                              >
                                <span
                                  className='d-block text-truncate'
                                  title={`${item.product_name}${
                                    item.variant_value
                                      ? ` - ${item.variant_value}`
                                      : ''
                                  } × ${item.quantity}`}
                                >
                                  <b>{item.product_name}</b>

                                  {item.variant_value
                                    ? ` - ${item.variant_value}`
                                    : ''}

                                  <span className='ms-1 text-orange-600'>
                                    × {item.quantity}
                                  </span>
                                </span>
                              </div>
                            ))}

                            {remainingItems > 0 && (
                              <span className='text-xs font-semibold text-slate-500'>
                                +{remainingItems} sản phẩm khác
                              </span>
                            )}
                          </div>
                        </td>

                        <td className='overflow-hidden px-3 py-3'>
                          <p
                            className='mb-1 font-semibold text-slate-800'
                            style={twoLineTextStyle}
                            title={
                              reasonLabels[returnRequest.reason] ||
                              returnRequest.reason ||
                              '-'
                            }
                          >
                            {reasonLabels[returnRequest.reason] ||
                              returnRequest.reason ||
                              '-'}
                          </p>

                          {returnRequest.description && (
                            <p
                              className='mb-0 text-xs text-slate-500'
                              style={twoLineTextStyle}
                              title={returnRequest.description}
                            >
                              {returnRequest.description}
                            </p>
                          )}
                        </td>

                        <td className='px-2 py-3 text-center'>
                          <ReturnStatusBadge
                            status={returnRequest.status}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      <Modal
        show={Boolean(detailTarget)}
        onHide={handleCloseDetailModal}
        centered
        size='lg'
        backdrop='static'
        keyboard={false}
      >
        <Modal.Header className='border-bottom px-4 py-3'>
          <div>
            <Modal.Title className='text-xl font-black text-slate-950'>
              Chi tiết yêu cầu trả hàng
            </Modal.Title>

            {detailTarget && (
              <p className='mb-0 mt-1 text-sm text-slate-500'>
                {formatOrderCode(detailTarget)}
              </p>
            )}
          </div>

          <button
            type='button'
            onClick={handleCloseDetailModal}
            disabled={Boolean(loadingId)}
            className={`
              ms-auto border-0 bg-transparent
              text-3xl leading-none text-slate-400
              hover:text-slate-700 disabled:opacity-50
            `}
            aria-label='Đóng'
          >
            ×
          </button>
        </Modal.Header>

        <Modal.Body className='p-4'>
          <Alert type='danger'>{modalError}</Alert>

          {detailTarget && (
            <>
              <div className='mb-4 row g-3'>
                <div className='col-12 col-md-6'>
                  <div
                    className={`
                      h-100 rounded-4 border border-slate-200
                      bg-slate-50 p-3
                    `}
                  >
                    <p className='mb-1 text-xs font-bold uppercase tracking-wide text-slate-500'>
                      Đơn hàng
                    </p>

                    <p className='mb-1 font-black text-orange-600'>
                      {formatOrderCode(detailTarget)}
                    </p>

                    <p className='mb-0 text-sm text-slate-600'>
                      Gửi yêu cầu ngày{' '}
                      {formatDate(detailRequest.requested_at)}
                    </p>
                  </div>
                </div>

                <div className='col-12 col-md-6'>
                  <div
                    className={`
                      h-100 rounded-4 border border-slate-200
                      bg-slate-50 p-3
                    `}
                  >
                    <p className='mb-1 text-xs font-bold uppercase tracking-wide text-slate-500'>
                      Khách hàng
                    </p>

                    <p className='mb-1 font-black text-slate-900'>
                      {getCustomerName(detailTarget)}
                    </p>

                    <p className='mb-0 break-all text-sm text-slate-600'>
                      {getCustomerContact(detailTarget)}
                    </p>
                  </div>
                </div>
              </div>

              <div className='mb-4'>
                <div className='mb-2 d-flex align-items-center justify-content-between gap-3'>
                  <h6 className='mb-0 font-black text-slate-900'>
                    Sản phẩm yêu cầu trả
                  </h6>

                  <ReturnStatusBadge status={detailRequest.status} />
                </div>

                <div
                  className={`
                    overflow-hidden rounded-4
                    border border-slate-200
                  `}
                >
                  {detailItems.map((item, index) => (
                    <div
                      key={String(
                        item.order_item_id ||
                          `${item.product_name}-${index}`,
                      )}
                      className={`
                        d-flex align-items-start
                        justify-content-between gap-3
                        border-bottom px-3 py-3
                        last:border-bottom-0
                      `}
                    >
                      <div className='min-w-0'>
                        <p className='mb-1 font-bold text-slate-900'>
                          {item.product_name}
                        </p>

                        {item.variant_value && (
                          <p className='mb-0 text-sm text-slate-500'>
                            Phân loại: {item.variant_value}
                          </p>
                        )}
                      </div>

                      <span
                        className={`
                          shrink-0 rounded-full bg-orange-50
                          px-3 py-1 text-sm font-black
                          text-orange-600
                        `}
                      >
                        × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className='mb-4 row g-3'>
                <div className='col-12 col-md-6'>
                  <div
                    className={`
                      h-100 rounded-4 border
                      border-slate-200 p-3
                    `}
                  >
                    <p className='mb-1 text-xs font-bold uppercase tracking-wide text-slate-500'>
                      Lý do trả hàng
                    </p>

                    <p className='mb-0 font-bold text-slate-900'>
                      {reasonLabels[detailRequest.reason] ||
                        detailRequest.reason ||
                        '-'}
                    </p>
                  </div>
                </div>

                <div className='col-12 col-md-6'>
                  <div
                    className={`
                      h-100 rounded-4 border
                      border-slate-200 p-3
                    `}
                  >
                    <p className='mb-1 text-xs font-bold uppercase tracking-wide text-slate-500'>
                      Mô tả của khách hàng
                    </p>

                    <p className='mb-0 text-sm text-slate-700'>
                      {detailRequest.description || 'Không có mô tả.'}
                    </p>
                  </div>
                </div>
              </div>

              {detailRequest.staff_note && (
                <div
                  className={`
                    mb-4 rounded-4 border border-blue-100
                    bg-blue-50 p-3
                  `}
                >
                  <p className='mb-1 text-xs font-bold uppercase tracking-wide text-blue-600'>
                    Ghi chú xử lý
                  </p>

                  <p className='mb-0 text-sm text-slate-700'>
                    {detailRequest.staff_note}
                  </p>
                </div>
              )}

              {isDetailPending && reviewDecision && (
                <div
                  className={`
                    rounded-4 border
                    ${
                      reviewDecision === 'approved'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-red-200 bg-red-50'
                    }
                    p-3
                  `}
                >
                  <div className='mb-3 d-flex align-items-center justify-content-between gap-3'>
                    <h6 className='mb-0 font-black text-slate-900'>
                      {reviewDecision === 'approved'
                        ? 'Duyệt yêu cầu trả hàng'
                        : 'Từ chối yêu cầu trả hàng'}
                    </h6>

                    <button
                      type='button'
                      onClick={handleBackToDetail}
                      disabled={Boolean(loadingId)}
                      className={`
                        border-0 bg-transparent
                        text-sm font-bold text-slate-500
                        hover:text-slate-800
                      `}
                    >
                      Chọn lại
                    </button>
                  </div>

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
                    rows='4'
                    maxLength='1000'
                    value={staffNote}
                    onChange={(event) =>
                      setStaffNote(event.target.value)
                    }
                    disabled={Boolean(loadingId)}
                    placeholder={
                      reviewDecision === 'approved'
                        ? 'Ví dụ: Đóng gói sản phẩm và gửi về địa chỉ kho...'
                        : 'Nhập lý do không chấp nhận yêu cầu trả hàng...'
                    }
                    className={`
                      form-control rounded-4
                      border-slate-200 px-3 py-3
                      shadow-none focus:border-orange-400
                      focus:ring-0
                    `}
                  />
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer className='border-top px-4 py-3'>
          {isDetailPending && !reviewDecision && (
            <>
              <Button
                type='button'
                variant='danger'
                onClick={() => handleSelectDecision('rejected')}
                disabled={Boolean(loadingId)}
              >
                Từ chối
              </Button>

              <Button
                type='button'
                variant='success'
                onClick={() => handleSelectDecision('approved')}
                disabled={Boolean(loadingId)}
              >
                Duyệt yêu cầu
              </Button>
            </>
          )}

          {isDetailPending && reviewDecision && (
            <Button
              type='button'
              variant={
                reviewDecision === 'approved'
                  ? 'success'
                  : 'danger'
              }
              onClick={handleSubmitReview}
              isLoading={Boolean(loadingId)}
            >
              {reviewDecision === 'approved'
                ? 'Xác nhận duyệt'
                : 'Xác nhận từ chối'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default ReturnManagementPage
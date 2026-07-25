import { useEffect, useMemo, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import DashboardLayout from '../../components/templates/DashboardLayout'
import LoadingText from '../../components/atoms/LoadingText'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'

import { getErrorMessage } from '../../services/api'
import {
  getStaffList,
  createStaff,
  toggleStaffStatus,
  getStaffPerformance,
} from '../../services/manager.service'
import {
  formatDate,
  getId,
  pickArray,
} from '../../utils/format'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
]

const STATUS_MAP = {
  active: {
    label: 'Hoạt động',
    bg: '#dcfce7',
    color: '#16a34a',
  },
  blocked: {
    label: 'Đã khóa',
    bg: '#fee2e2',
    color: '#dc2626',
  },
  inactive: {
    label: 'Không hoạt động',
    bg: '#f1f5f9',
    color: '#64748b',
  },
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')
}

function StatusPill({ value }) {
  const config =
    STATUS_MAP[String(value || '').toLowerCase()] || {
      label: value || '—',
      bg: '#f1f5f9',
      color: '#64748b',
    }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 11px',
        borderRadius: 20,
        background: config.bg,
        color: config.color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}

function Avatar({
  user,
  size = 42,
}) {
  const [imageError, setImageError] = useState(false)

  const source =
    user?.avatar_url ||
    user?.img_url ||
    user?.avatar ||
    ''

  const firstCharacterCode =
    user?.name?.charCodeAt(0) || 0

  const colorIndex =
    firstCharacterCode % AVATAR_COLORS.length

  useEffect(() => {
    setImageError(false)
  }, [source])

  if (source && !imageError) {
    return (
      <img
        src={source}
        alt={user?.name || 'Ảnh nhân viên'}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '2px solid #e2e8f0',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: AVATAR_COLORS[colorIndex],
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: size * 0.38,
        userSelect: 'none',
      }}
    >
      {getInitials(user?.name) || '?'}
    </div>
  )
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      className='rounded-4 border border-slate-200 bg-white p-3'
    >
      <p className='mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400'>
        {label}
      </p>

      <p
        className='mb-0 text-sm font-semibold text-slate-800'
        style={{
          overflowWrap: 'anywhere',
        }}
      >
        {value || '—'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Detail modal
// ─────────────────────────────────────────────────────────
function StaffDetailModal({
  show,
  onHide,
  staff,
  onRequestToggleStatus,
  togglingId,
}) {
  const [performance, setPerformance] = useState(null)
  const [performanceLoading, setPerformanceLoading] =
    useState(false)
  const [performanceError, setPerformanceError] =
    useState('')

  useEffect(() => {
    if (!show || !staff) return undefined

    let mounted = true

    setPerformanceLoading(true)
    setPerformanceError('')
    setPerformance(null)

    getStaffPerformance(getId(staff))
      .then((response) => {
        if (mounted) {
          setPerformance(
            response?.data ?? response,
          )
        }
      })
      .catch((error) => {
        if (mounted) {
          setPerformanceError(
            getErrorMessage(
              error,
              'Không tải được hiệu suất.',
            ),
          )
        }
      })
      .finally(() => {
        if (mounted) {
          setPerformanceLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [
    show,
    staff,
  ])

  if (!staff) return null

  const staffId = getId(staff)

  const isBlocked =
    String(
      staff.status || '',
    ).toLowerCase() === 'blocked'

  const isToggling =
    String(togglingId) ===
    String(staffId)

  const lastLogin =
    staff.last_login ||
    staff.lastLogin ||
    staff.last_login_at ||
    null

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size='lg'
      scrollable
    >
      <Modal.Header
        closeButton={!isToggling}
        className='border-0 pb-0'
      >
        <Modal.Title className='text-lg font-black text-slate-950'>
          Chi tiết nhân viên
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className='pt-3'>
        <div className='mb-4 d-flex align-items-center gap-3 rounded-4 border border-slate-200 bg-slate-50 p-3'>
          <Avatar
            user={staff}
            size={66}
          />

          <div className='min-w-0'>
            <h5 className='mb-1 text-lg font-black text-slate-950'>
              {staff.name || 'Chưa có tên'}
            </h5>

            <p className='mb-2 text-sm text-slate-500'>
              {staff.email || 'Chưa có email'}
            </p>

            <div className='d-flex flex-wrap align-items-center gap-2'>
              <StatusPill
                value={staff.status || 'active'}
              />

              <span className='rounded-pill bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600'>
                Nhân viên
              </span>
            </div>
          </div>
        </div>

        <div className='mb-4 rounded-4 border border-blue-100 bg-blue-50 p-3'>
          <p className='mb-1 text-[10px] font-black uppercase tracking-wider text-blue-500'>
            Đăng nhập lần cuối
          </p>

          <p className='mb-0 text-sm font-black text-slate-800'>
            {lastLogin
              ? formatDateTime(lastLogin)
              : 'Chưa có dữ liệu'}
          </p>
        </div>

        <div className='mb-4'>
          <div className='mb-3'>
            <h6 className='mb-1 font-black text-slate-900'>
              Hiệu suất xử lý đơn hàng
            </h6>

            <p className='mb-0 text-xs text-slate-500'>
              Thống kê công việc của nhân viên.
            </p>
          </div>

          {performanceLoading && (
            <LoadingText />
          )}

          {performanceError && (
            <Alert type='danger'>
              {performanceError}
            </Alert>
          )}

          {performance && (
            <div className='row g-3'>
              <div className='col-12 col-md-6'>
                <div className='h-100 rounded-4 border border-slate-200 bg-white p-3 text-center'>
                  <p className='mb-1 text-2xl font-black text-blue-600'>
                    {performance?.performance
                      ?.total_handled_orders ?? '—'}
                  </p>

                  <p className='mb-0 text-xs font-bold text-slate-500'>
                    Đơn đã xử lý
                  </p>
                </div>
              </div>

              <div className='col-12 col-md-6'>
                <div className='h-100 rounded-4 border border-slate-200 bg-white p-3 text-center'>
                  <p className='mb-1 text-2xl font-black text-emerald-600'>
                    {performance?.performance
                      ?.average_handling_time_text ?? '—'}
                  </p>

                  <p className='mb-0 text-xs font-bold text-slate-500'>
                    Thời gian xử lý trung bình
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className='mb-3'>
            <h6 className='mb-1 font-black text-slate-900'>
              Thông tin tài khoản
            </h6>

            <p className='mb-0 text-xs text-slate-500'>
              Thông tin cá nhân và thời gian tạo tài khoản.
            </p>
          </div>

          <div className='row g-3'>
            <div className='col-12 col-md-6'>
              <InfoRow
                label='Mã nhân viên'
                value={String(staffId)
                  .slice(-12)
                  .toUpperCase()}
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Họ và tên'
                value={staff.name}
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Email'
                value={staff.email}
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Số điện thoại'
                value={
                  staff.phone ||
                  staff.phone_number
                }
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Ngày sinh'
                value={formatDate(
                  staff.date_of_birth ||
                    staff.dob,
                )}
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Giới tính'
                value={
                  staff.gender === 'male'
                    ? 'Nam'
                    : staff.gender === 'female'
                      ? 'Nữ'
                      : staff.gender || '—'
                }
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Ngày tạo'
                value={formatDateTime(
                  staff.created_at ||
                    staff.createdAt,
                )}
              />
            </div>

            <div className='col-12 col-md-6'>
              <InfoRow
                label='Cập nhật lần cuối'
                value={formatDateTime(
                  staff.updated_at ||
                    staff.updatedAt,
                )}
              />
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className='border-0 pt-0'>
        <div className='d-flex w-100 flex-nowrap align-items-center justify-content-between gap-3'>
          <Button
            type='button'
            variant={
              isBlocked
                ? 'success-subtle'
                : 'danger-subtle'
            }
            onClick={() =>
              onRequestToggleStatus(staff)
            }
            disabled={isToggling}
            style={{
              whiteSpace: 'nowrap',
            }}
          >
            {isToggling
              ? 'Đang xử lý...'
              : isBlocked
                ? 'Mở khóa tài khoản'
                : 'Khóa tài khoản'}
          </Button>

          <Button
            type='button'
            variant='outline'
            onClick={onHide}
            disabled={isToggling}
          >
            Đóng
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Create staff modal
// ─────────────────────────────────────────────────────────
function CreateStaffModal({
  show,
  onHide,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] =
    useState(false)

  useEffect(() => {
    if (!show) return

    setForm(EMPTY_FORM)
    setErrors({})
    setApiError('')
    setShowPassword(false)
  }, [show])

  const setField =
    (field) =>
    (event) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value,
      }))

      setErrors((previous) => ({
        ...previous,
        [field]: '',
      }))
    }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Vui lòng nhập họ tên.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Vui lòng nhập email.'
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email,
      )
    ) {
      nextErrors.email = 'Email không hợp lệ.'
    }

    if (!form.password) {
      nextErrors.password =
        'Vui lòng nhập mật khẩu.'
    } else if (form.password.length < 6) {
      nextErrors.password =
        'Mật khẩu tối thiểu 6 ký tự.'
    }

    if (
      form.confirmPassword !==
      form.password
    ) {
      nextErrors.confirmPassword =
        'Mật khẩu xác nhận không khớp.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validate()

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors)
      return
    }

    try {
      setLoading(true)
      setApiError('')

      await createStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone:
          form.phone.trim() || undefined,
      })

      await onCreated()
      onHide()
    } catch (error) {
      setApiError(
        getErrorMessage(
          error,
          'Không thể tạo tài khoản nhân viên.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size='md'
      backdrop={loading ? 'static' : true}
      keyboard={!loading}
    >
      <Modal.Header
        closeButton={!loading}
        className='border-0 pb-0'
      >
        <Modal.Title className='text-lg font-black text-slate-950'>
          Thêm tài khoản nhân viên
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className='pt-3'>
          {apiError && (
            <Alert type='danger'>
              {apiError}
            </Alert>
          )}

          <TextField
            label='Họ và tên'
            placeholder='Ví dụ: Nguyễn Văn A'
            value={form.name}
            onChange={setField('name')}
            error={errors.name}
            className='mb-3'
            required
          />

          <TextField
            label='Email'
            type='email'
            placeholder='nhanvien@techsale.vn'
            value={form.email}
            onChange={setField('email')}
            error={errors.email}
            className='mb-3'
            required
          />

          <TextField
            label='Số điện thoại'
            type='tel'
            placeholder='Ví dụ: 0912345678'
            value={form.phone}
            onChange={setField('phone')}
            className='mb-3'
          />

          <div className='position-relative mb-3'>
            <TextField
              label='Mật khẩu'
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              placeholder='Tối thiểu 6 ký tự'
              value={form.password}
              onChange={setField('password')}
              error={errors.password}
              required
            />

            <button
              type='button'
              onClick={() =>
                setShowPassword(
                  (previous) => !previous,
                )
              }
              className='position-absolute border-0 bg-transparent text-slate-400'
              style={{
                right: 12,
                top: 37,
                zIndex: 2,
              }}
              aria-label={
                showPassword
                  ? 'Ẩn mật khẩu'
                  : 'Hiện mật khẩu'
              }
            >
              <i
                className={
                  showPassword
                    ? 'bi bi-eye-slash'
                    : 'bi bi-eye'
                }
              />
            </button>
          </div>

          <TextField
            label='Xác nhận mật khẩu'
            type='password'
            placeholder='Nhập lại mật khẩu'
            value={form.confirmPassword}
            onChange={setField(
              'confirmPassword',
            )}
            error={
              errors.confirmPassword
            }
            className='mb-3'
            required
          />

          <div className='rounded-4 border border-blue-100 bg-blue-50 p-3'>
            <p className='mb-0 text-xs font-semibold leading-relaxed text-blue-700'>
              Tài khoản sẽ được tạo với vai trò
              <strong> Nhân viên</strong> và trạng thái
              <strong> Hoạt động</strong>.
            </p>
          </div>
        </Modal.Body>

        <Modal.Footer className='border-0 pt-0'>
          <Button
            type='button'
            variant='outline'
            onClick={onHide}
            disabled={loading}
          >
            Hủy
          </Button>

          <Button
            type='submit'
            disabled={loading}
          >
            {loading
              ? 'Đang tạo...'
              : 'Tạo tài khoản'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Status warning modal
// ─────────────────────────────────────────────────────────
function StaffStatusWarningModal({
  staff,
  isUpdating,
  onCancel,
  onConfirm,
}) {
  const isBlocked =
    String(
      staff?.status || '',
    ).toLowerCase() === 'blocked'

  const willBlock = !isBlocked

  return (
    <Modal
      show={Boolean(staff)}
      onHide={onCancel}
      centered
      backdrop={isUpdating ? 'static' : true}
      keyboard={!isUpdating}
    >
      <Modal.Header
        closeButton={!isUpdating}
        className='border-0 pb-0'
      >
        <Modal.Title className='d-flex align-items-center gap-3 text-lg font-black text-slate-950'>
          <span
            className={`
              d-flex align-items-center justify-content-center
              rounded-circle
              ${
                willBlock
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-600'
              }
            `}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
            }}
          >
            <i
              className={
                willBlock
                  ? 'bi bi-exclamation-triangle-fill'
                  : 'bi bi-unlock-fill'
              }
            />
          </span>

          {willBlock
            ? 'Xác nhận khóa nhân viên'
            : 'Xác nhận mở khóa nhân viên'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className='pt-3'>
        <div
          className={`
            rounded-4 border p-4
            ${
              willBlock
                ? 'border-red-200 bg-red-50'
                : 'border-emerald-200 bg-emerald-50'
            }
          `}
        >
          <p
            className={`
              mb-2 font-black
              ${
                willBlock
                  ? 'text-red-900'
                  : 'text-emerald-900'
              }
            `}
          >
            {willBlock
              ? 'Tài khoản nhân viên sẽ bị vô hiệu hóa.'
              : 'Tài khoản nhân viên sẽ được hoạt động trở lại.'}
          </p>

          <p
            className={`
              mb-0 text-sm leading-relaxed
              ${
                willBlock
                  ? 'text-red-700'
                  : 'text-emerald-700'
              }
            `}
          >
            {willBlock
              ? 'Nhân viên sẽ không thể đăng nhập hoặc truy cập các chức năng dành cho Staff cho đến khi được mở khóa.'
              : 'Nhân viên sẽ có thể đăng nhập và tiếp tục sử dụng các chức năng được phân quyền.'}
          </p>
        </div>

        <div className='mt-4 d-flex align-items-center gap-3 rounded-4 border border-slate-200 p-3'>
          <Avatar
            user={staff}
            size={48}
          />

          <div className='min-w-0'>
            <p className='mb-0 font-black text-slate-900'>
              {staff?.name || 'Nhân viên'}
            </p>

            <p className='mb-0 text-sm text-slate-500'>
              {staff?.email || '—'}
            </p>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className='border-0 pt-0'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          disabled={isUpdating}
        >
          Hủy
        </Button>

        <Button
          type='button'
          variant={
            willBlock
              ? 'danger-subtle'
              : 'success-subtle'
          }
          onClick={onConfirm}
          disabled={isUpdating}
        >
          {isUpdating
            ? 'Đang cập nhật...'
            : willBlock
              ? 'Vẫn khóa tài khoản'
              : 'Xác nhận mở khóa'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
function StaffManagementPage() {
  const [staffList, setStaffList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] =
    useState('')

  const [selectedStaff, setSelectedStaff] =
    useState(null)

  const [showCreate, setShowCreate] =
    useState(false)

  const [pendingStatusStaff, setPendingStatusStaff] =
    useState(null)

  const [togglingId, setTogglingId] =
    useState('')

  const loadStaff = async (
    silent = false,
  ) => {
    try {
      if (!silent) {
        setIsLoading(true)
      }

      setError('')

      const response = await getStaffList()

      const list =
        response?.data ??
        pickArray(response, [])

      const nextStaffList =
        Array.isArray(list)
          ? list
          : []

      setStaffList(nextStaffList)

      setSelectedStaff((previous) => {
        if (!previous) return null

        return (
          nextStaffList.find(
            (staff) =>
              String(getId(staff)) ===
              String(getId(previous)),
          ) || previous
        )
      })

      return nextStaffList
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được danh sách nhân viên.',
        ),
      )

      return []
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  useEffect(() => {
    if (!success) return undefined

    const timeoutId = setTimeout(() => {
      setSuccess('')
    }, 4000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [success])

  const filteredStaff = useMemo(
    () =>
      staffList.filter((staff) => {
        const normalizedSearch =
          search.trim().toLowerCase()

        const matchesSearch =
          !normalizedSearch ||
          String(staff.name || '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(staff.email || '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(
            staff.phone ||
              staff.phone_number ||
              '',
          ).includes(search.trim())

        const matchesStatus =
          !filterStatus ||
          String(
            staff.status || '',
          ).toLowerCase() === filterStatus

        return (
          matchesSearch &&
          matchesStatus
        )
      }),
    [
      staffList,
      search,
      filterStatus,
    ],
  )

  const handleConfirmToggleStatus = async () => {
    if (!pendingStatusStaff) return

    const staffId =
      getId(pendingStatusStaff)

    const currentStatus =
      String(
        pendingStatusStaff.status || '',
      ).toLowerCase()

    const nextStatus =
      currentStatus === 'blocked'
        ? 'active'
        : 'blocked'

    try {
      setTogglingId(staffId)
      setError('')

      await toggleStaffStatus(
        staffId,
        nextStatus,
      )

      setSuccess(
        nextStatus === 'blocked'
          ? `Đã khóa tài khoản ${pendingStatusStaff.name || ''}.`
          : `Đã mở khóa tài khoản ${pendingStatusStaff.name || ''}.`,
      )

      setPendingStatusStaff(null)

      setStaffList((previous) =>
        previous.map((staff) =>
          String(getId(staff)) ===
          String(staffId)
            ? {
                ...staff,
                status: nextStatus,
              }
            : staff,
        ),
      )

      setSelectedStaff((previous) =>
        previous &&
        String(getId(previous)) ===
          String(staffId)
          ? {
              ...previous,
              status: nextStatus,
            }
          : previous,
      )

      await loadStaff(true)
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
          'Không thể cập nhật trạng thái.',
        ),
      )
    } finally {
      setTogglingId('')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('')
  }

  return (
    <DashboardLayout
      title='Quản lý nhân viên'
      description='Xem thông tin, tạo tài khoản và quản lý trạng thái nhân viên.'
    >
      {error && (
        <Alert type='danger'>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          type='success'
          className='mb-4'
        >
          {success}
        </Alert>
      )}

      {/* Thanh công cụ đồng bộ với các trang quản lý khác */}
      <Card className='card-surface mb-4 rounded-4 border-0 shadow-sm'>
        <Card.Body className='p-4'>
          <Row className='g-3 align-items-center'>
            <Col lg={9}>
              <div className='d-flex flex-column flex-sm-row align-items-stretch gap-2'>
                <div
                  className='flex-grow-1'
                  style={{
                    minWidth: 0,
                    maxWidth: 500,
                  }}
                >
                  <TextField
                    placeholder='Tìm theo tên, email, số điện thoại...'
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    className='mb-0'
                  />
                </div>

                <Form.Select
                  value={filterStatus}
                  onChange={(event) =>
                    setFilterStatus(
                      event.target.value,
                    )
                  }
                  className='rounded-3 border-slate-200 text-sm shadow-none'
                  style={{
                    width: 220,
                    minWidth: 220,
                    minHeight: 42,
                  }}
                >
                  <option value=''>
                    Tất cả trạng thái
                  </option>

                  <option value='active'>
                    Hoạt động
                  </option>

                  <option value='blocked'>
                    Đã khóa
                  </option>

                  <option value='inactive'>
                    Không hoạt động
                  </option>
                </Form.Select>
              </div>
            </Col>

            <Col lg={3}>
              <div className='d-flex flex-column align-items-lg-end gap-2'>
                <span className='text-sm font-bold text-slate-400'>
                  {filteredStaff.length} nhân viên
                </span>

                <Button
                  type='button'
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className='px-4 py-2'
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Thêm nhân viên
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng nhân viên */}
      <Card className='card-surface overflow-hidden rounded-4 border-0 shadow-sm'>
        <Card.Body className='p-0'>
          {isLoading ? (
            <div className='p-5'>
              <LoadingText />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className='p-5 text-center'>
              <div className='mb-3 text-5xl'>
                👤
              </div>

              <h5 className='mb-1 font-black text-slate-900'>
                {staffList.length === 0
                  ? 'Chưa có nhân viên'
                  : 'Không tìm thấy nhân viên'}
              </h5>

              <p className='mb-4 text-sm text-slate-500'>
                {staffList.length === 0
                  ? 'Hãy tạo tài khoản nhân viên đầu tiên.'
                  : 'Thử thay đổi từ khóa hoặc trạng thái lọc.'}
              </p>

              {staffList.length === 0 && (
                <Button
                  type='button'
                  onClick={() =>
                    setShowCreate(true)
                  }
                >
                  + Thêm nhân viên
                </Button>
              )}
            </div>
          ) : (
            <Table
              responsive
              hover
              className='mb-0 align-middle'
            >
              <thead
                style={{
                  background: '#f8fafc',
                }}
              >
                <tr>
                  <th className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Nhân viên
                  </th>

                  <th className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Liên hệ
                  </th>

                  <th className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Trạng thái
                  </th>

                  <th className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Ngày tạo
                  </th>

                  <th className='border-0 p-4 text-end text-xs font-black uppercase tracking-wider text-slate-400'>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((staff) => {
                  const staffId =
                    getId(staff)

                  const isBlocked =
                    String(
                      staff.status || '',
                    ).toLowerCase() ===
                    'blocked'

                  const isToggling =
                    String(togglingId) ===
                    String(staffId)

                  return (
                    <tr
                      key={staffId}
                      style={{
                        borderBottom:
                          '1px solid #f1f5f9',
                      }}
                    >
                      <td className='p-4'>
                        <div className='d-flex align-items-center gap-3'>
                          <Avatar
                            user={staff}
                            size={46}
                          />

                          <div className='min-w-0'>
                            <p className='mb-1 text-sm font-black text-slate-900'>
                              {staff.name || '—'}
                            </p>

                            <p className='mb-0 text-xs text-slate-400'>
                              Mã: #
                              {String(staffId)
                                .slice(-8)
                                .toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className='p-4'>
                        <p className='mb-1 text-sm font-semibold text-slate-700'>
                          {staff.email || '—'}
                        </p>

                        <p className='mb-0 text-xs text-slate-400'>
                          {staff.phone ||
                            staff.phone_number ||
                            'Chưa có số điện thoại'}
                        </p>
                      </td>

                      <td className='p-4'>
                        <StatusPill
                          value={
                            staff.status ||
                            'active'
                          }
                        />
                      </td>

                      <td className='p-4 text-sm font-semibold text-slate-500'>
                        {formatDate(
                          staff.created_at ||
                            staff.createdAt,
                        )}
                      </td>

                      <td className='p-4 text-end'>
                        <div className='d-flex flex-nowrap justify-content-end gap-2'>
                          <Button
                            type='button'
                            size='sm'
                            variant='light'
                            onClick={() =>
                              setSelectedStaff(
                                staff,
                              )
                            }
                            className='px-3'
                            style={{
                              color: '#3b82f6',
                              background: '#eff6ff',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Chi tiết
                          </Button>

                          <Button
                            type='button'
                            size='sm'
                            variant={
                              isBlocked
                                ? 'success-subtle'
                                : 'danger-subtle'
                            }
                            onClick={() =>
                              setPendingStatusStaff(
                                staff,
                              )
                            }
                            disabled={isToggling}
                            className='px-3'
                            style={{
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isToggling
                              ? 'Đang xử lý...'
                              : isBlocked
                                ? 'Mở khóa'
                                : 'Khóa'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <CreateStaffModal
        show={showCreate}
        onHide={() =>
          setShowCreate(false)
        }
        onCreated={async () => {
          await loadStaff(true)

          setSuccess(
            'Tạo tài khoản nhân viên thành công.',
          )
        }}
      />

      <StaffDetailModal
        show={Boolean(selectedStaff)}
        onHide={() =>
          setSelectedStaff(null)
        }
        staff={selectedStaff}
        onRequestToggleStatus={(staff) =>
          setPendingStatusStaff(staff)
        }
        togglingId={togglingId}
      />

      <StaffStatusWarningModal
        staff={pendingStatusStaff}
        isUpdating={Boolean(togglingId)}
        onCancel={() => {
          if (!togglingId) {
            setPendingStatusStaff(null)
          }
        }}
        onConfirm={handleConfirmToggleStatus}
      />
    </DashboardLayout>
  )
}

export default StaffManagementPage
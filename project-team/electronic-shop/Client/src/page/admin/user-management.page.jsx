import { useEffect, useMemo, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import SelectField from '../../components/atoms/SelectField'

import api, { getErrorMessage } from '../../services/api'
import {
  getUsers,
  createUser,
  updateUser,
} from '../../services/user.service'
import { getId, pickArray } from '../../utils/format'

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
    label: 'Bị khóa',
    bg: '#fee2e2',
    color: '#dc2626',
  },
  inactive: {
    label: 'Không hoạt động',
    bg: '#f1f5f9',
    color: '#64748b',
  },
}

const ROLE_CODE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
}

const HIDDEN_DETAIL_FIELDS = new Set([
  'avatar',
  'avatar_url',
  'img_url',
  'profile_image',
  'profile_image_url',
])

const SENSITIVE_FIELDS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'hashed_password',
  'refresh_token',
  'refreshtoken',
  'access_token',
  'accesstoken',
  'reset_password_token',
  'resetpasswordtoken',
  'reset_token',
  'resettoken',
  'verification_token',
  'verificationtoken',
  'email_verification_token',
  'emailverificationtoken',
  'otp',
  'otp_code',
  'otpcode',
  'secret',
  '__v',
])

const FIELD_LABELS = {
  _id: 'Mã tài khoản',
  id: 'Mã tài khoản',
  user_id: 'Mã người dùng',
  name: 'Họ và tên',
  full_name: 'Họ và tên',
  fullname: 'Họ và tên',
  email: 'Email',
  phone: 'Số điện thoại',
  phone_number: 'Số điện thoại',
  gender: 'Giới tính',
  dob: 'Ngày sinh',
  birthday: 'Ngày sinh',
  date_of_birth: 'Ngày sinh',
  role_id: 'Vai trò',
  role: 'Vai trò',
  status: 'Trạng thái',
  address: 'Địa chỉ',
  addresses: 'Danh sách địa chỉ',
  provider: 'Nhà cung cấp đăng nhập',
  auth_provider: 'Nhà cung cấp đăng nhập',
  google_id: 'Google ID',
  is_verified: 'Đã xác thực',
  email_verified: 'Email đã xác thực',
  is_email_verified: 'Email đã xác thực',
  created_at: 'Ngày tạo',
  createdAt: 'Ngày tạo',
  updated_at: 'Cập nhật lần cuối',
  updatedAt: 'Cập nhật lần cuối',
  last_login_at: 'Đăng nhập gần nhất',
}

const PRIORITY_FIELDS = [
  '_id',
  'id',
  'user_id',
  'name',
  'full_name',
  'fullname',
  'email',
  'phone',
  'phone_number',
  'gender',
  'dob',
  'birthday',
  'date_of_birth',
  'role_id',
  'role',
  'status',
  'provider',
  'auth_provider',
  'is_verified',
  'email_verified',
  'is_email_verified',
  'address',
  'addresses',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'last_login_at',
]

const DATE_FIELD_PATTERN =
  /(^|_)(date|dob|birthday|created|updated|login|time|at)($|_)/i

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
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

function getRoleId(user) {
  return String(
    user?.role_id?._id ||
      user?.role_id?.id ||
      user?.role_id ||
      user?.role?._id ||
      user?.role?.id ||
      user?.role ||
      '',
  )
}

function getRoleLabel(role) {
  if (!role) return 'Chưa xác định'

  if (typeof role === 'string') {
    return ROLE_CODE_LABELS[role.toUpperCase()] || role
  }

  const roleCode = String(role.code || '').toUpperCase()

  if (ROLE_CODE_LABELS[roleCode]) {
    return ROLE_CODE_LABELS[roleCode]
  }

  return role.name || 'Chưa xác định'
}

function getRoleName(user) {
  return getRoleLabel(
    user?.role_id ||
      user?.role,
  )
}

function getFieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]

  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function isSensitiveField(key) {
  const normalizedKey = String(key || '').toLowerCase()

  if (SENSITIVE_FIELDS.has(normalizedKey)) {
    return true
  }

  return (
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('secret') ||
    normalizedKey.includes('otp')
  )
}

function isHiddenDetailField(key) {
  return HIDDEN_DETAIL_FIELDS.has(
    String(key || '').toLowerCase(),
  )
}

function formatObjectValue(value) {
  if (!value || typeof value !== 'object') {
    return String(value || '—')
  }

  if (value.name || value.code) {
    return getRoleLabel(value)
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatUserValue(key, value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—'
  }

  if (key === 'role_id' || key === 'role') {
    return formatObjectValue(value)
  }

  if (
    key === 'status' &&
    STATUS_MAP[String(value).toLowerCase()]
  ) {
    return STATUS_MAP[String(value).toLowerCase()].label
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không'
  }

  if (
    DATE_FIELD_PATTERN.test(key) &&
    (
      typeof value === 'string' ||
      typeof value === 'number'
    )
  ) {
    return formatDateTime(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—'

    return value
      .map((item, index) => {
        if (item && typeof item === 'object') {
          return `${index + 1}. ${formatObjectValue(item)}`
        }

        return `${index + 1}. ${String(item)}`
      })
      .join('\n')
  }

  if (typeof value === 'object') {
    return formatObjectValue(value)
  }

  return String(value)
}

function getSafeUserInformation(user) {
  if (!user) return []

  const entries = Object.entries(user).filter(
    ([key]) =>
      !isSensitiveField(key) &&
      !isHiddenDetailField(key),
  )

  const entryMap = new Map(entries)
  const orderedEntries = []

  PRIORITY_FIELDS.forEach((key) => {
    if (entryMap.has(key)) {
      orderedEntries.push([key, entryMap.get(key)])
      entryMap.delete(key)
    }
  })

  entryMap.forEach((value, key) => {
    orderedEntries.push([key, value])
  })

  return orderedEntries.map(([key, value]) => ({
    key,
    label: getFieldLabel(key),
    value: formatUserValue(key, value),
  }))
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
        fontSize: 11,
        fontWeight: 800,
        padding: '4px 11px',
        borderRadius: 20,
        background: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}

function Avatar({
  user,
  size = 40,
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
        alt={user?.name || 'Ảnh đại diện'}
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

function InformationItem({
  label,
  value,
}) {
  return (
    <div
      className='h-100 rounded-4 border border-slate-200 bg-white p-3'
    >
      <p
        className='mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400'
      >
        {label}
      </p>

      <p
        className='mb-0 text-sm font-semibold text-slate-800'
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Detail modal
// ─────────────────────────────────────────────────────────
function UserDetailModal({
  show,
  onHide,
  user,
  onRefresh,
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [isStatusWarningOpen, setIsStatusWarningOpen] =
    useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  const safeInformation = useMemo(
    () => getSafeUserInformation(user),
    [user],
  )

  useEffect(() => {
    if (!show || !user) return

    setFormData({
      name: user.name || '',
      phone: user.phone || '',
    })

    setEditMode(false)
    setIsStatusWarningOpen(false)
    setError('')
    setSuccess('')
  }, [show, user])

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên.')
      return
    }

    try {
      setIsUpdating(true)
      setError('')
      setSuccess('')

      await updateUser(
        getId(user),
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        },
      )

      setSuccess('Cập nhật thông tin tài khoản thành công.')
      setEditMode(false)
      await onRefresh()
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
          'Không thể cập nhật tài khoản.',
        ),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleStatus = async () => {
    const nextStatus =
      user.status === 'active'
        ? 'blocked'
        : 'active'

    try {
      setIsUpdating(true)
      setError('')

      await updateUser(
        getId(user),
        {
          status: nextStatus,
        },
      )

      setIsStatusWarningOpen(false)
      await onRefresh()
      onHide()
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
          'Không thể cập nhật trạng thái.',
        ),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) return null

  const isBlocking =
    user.status === 'active'

  return (
    <>
      <Modal
        show={show}
      onHide={onHide}
      size='lg'
      centered
      scrollable
    >
      <Modal.Header
        closeButton={!isUpdating}
        className='border-0 pb-0'
      >
        <Modal.Title
          style={{
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Chi tiết tài khoản
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className='pt-3'>
        {error && (
          <Alert
            type='danger'
            className='mb-3 p-2 text-sm'
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            type='success'
            className='mb-3 p-2 text-sm'
          >
            {success}
          </Alert>
        )}

        <div
          className='mb-4 d-flex align-items-center gap-3 rounded-4 border bg-slate-50 p-3'
        >
          <Avatar
            user={user}
            size={68}
          />

          <div className='min-w-0'>
            <h5 className='mb-1 text-lg font-black text-slate-950'>
              {user.name || 'Chưa có tên'}
            </h5>

            <p className='mb-2 text-sm text-slate-500'>
              {user.email || 'Chưa có email'}
            </p>

            <div className='d-flex flex-wrap align-items-center gap-2'>
              <StatusPill value={user.status} />

              <span
                className='rounded-pill bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600'
              >
                {getRoleName(user)}
              </span>
            </div>
          </div>
        </div>

        {!editMode ? (
          <>

            <div className='row g-3'>
              {safeInformation.map((item) => (
                <div
                  key={item.key}
                  className='col-12 col-md-6'
                >
                  <InformationItem
                    label={item.label}
                    value={item.value}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className='rounded-4 border border-slate-200 bg-slate-50 p-3'>
            <TextField
              label='Họ và tên'
              value={formData.name}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className='mb-3'
            />

            <TextField
              label='Số điện thoại'
              value={formData.phone}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }))
              }
              className='mb-0'
            />

            <p className='mb-0 mt-3 text-xs text-slate-500'>
              Vai trò được thay đổi trực tiếp tại danh sách người dùng
              và luôn cần xác nhận cảnh báo.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className='border-0 pt-0'>
        {!editMode ? (
          <div className='d-flex w-100 flex-nowrap align-items-center justify-content-between gap-3'>
            <Button
              variant={
                user.status === 'active'
                  ? 'danger-subtle'
                  : 'success-subtle'
              }
              onClick={() => setIsStatusWarningOpen(true)}
              disabled={isUpdating}
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              <span className='fw-bold'>
                {user.status === 'active'
                  ? 'Khóa tài khoản'
                  : 'Mở khóa tài khoản'}
              </span>
            </Button>

            <div className='d-flex flex-nowrap justify-content-end gap-2'>
              <Button
                variant='outline'
                onClick={onHide}
                disabled={isUpdating}
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                Đóng
              </Button>

              <Button
                onClick={() => setEditMode(true)}
                disabled={isUpdating}
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                Chỉnh sửa thông tin
              </Button>
            </div>
          </div>
        ) : (
          <div className='d-flex w-100 justify-content-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setEditMode(false)
                setFormData({
                  name: user.name || '',
                  phone: user.phone || '',
                })
              }}
              disabled={isUpdating}
            >
              Hủy
            </Button>

            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating
                ? 'Đang lưu...'
                : 'Lưu thay đổi'}
            </Button>
          </div>
        )}
      </Modal.Footer>
      </Modal>

      <Modal
        show={isStatusWarningOpen}
        onHide={() => {
          if (!isUpdating) {
            setIsStatusWarningOpen(false)
          }
        }}
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
                  isBlocking
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
                  isBlocking
                    ? 'bi bi-exclamation-triangle-fill'
                    : 'bi bi-unlock-fill'
                }
              />
            </span>

            {isBlocking
              ? 'Xác nhận khóa tài khoản'
              : 'Xác nhận mở khóa tài khoản'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className='pt-3'>
          <div
            className={`
              rounded-4 border p-4
              ${
                isBlocking
                  ? 'border-red-200 bg-red-50'
                  : 'border-emerald-200 bg-emerald-50'
              }
            `}
          >
            <p
              className={`
                mb-2 font-black
                ${
                  isBlocking
                    ? 'text-red-900'
                    : 'text-emerald-900'
                }
              `}
            >
              {isBlocking
                ? 'Tài khoản sẽ bị vô hiệu hóa.'
                : 'Tài khoản sẽ được hoạt động trở lại.'}
            </p>

            <p
              className={`
                mb-0 text-sm leading-relaxed
                ${
                  isBlocking
                    ? 'text-red-700'
                    : 'text-emerald-700'
                }
              `}
            >
              {isBlocking
                ? 'Người dùng sẽ không thể đăng nhập bằng tài khoản này cho đến khi quản trị viên mở khóa lại.'
                : 'Người dùng sẽ có thể đăng nhập và sử dụng lại các chức năng theo vai trò hiện tại.'}
            </p>
          </div>

          <div className='mt-4 rounded-4 border border-slate-200 p-3'>
            <div className='d-flex align-items-center gap-3'>
              <Avatar
                user={user}
                size={46}
              />

              <div className='min-w-0'>
                <p className='mb-0 font-black text-slate-900'>
                  {user.name || 'Người dùng'}
                </p>

                <p className='mb-0 text-sm text-slate-500'>
                  {user.email || '—'}
                </p>
              </div>
            </div>

            <div className='mt-3 d-flex align-items-center justify-content-between rounded-3 bg-slate-50 px-3 py-2'>
              <span className='text-xs font-bold text-slate-500'>
                Trạng thái sau khi cập nhật
              </span>

              <StatusPill
                value={
                  isBlocking
                    ? 'blocked'
                    : 'active'
                }
              />
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='border-0 pt-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsStatusWarningOpen(false)}
            disabled={isUpdating}
          >
            Hủy
          </Button>

          <Button
            type='button'
            variant={
              isBlocking
                ? 'danger-subtle'
                : 'success-subtle'
            }
            onClick={handleToggleStatus}
            disabled={isUpdating}
          >
            {isUpdating
              ? 'Đang cập nhật...'
              : isBlocking
                ? 'Khóa tài khoản'
                : 'Xác nhận mở khóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Role warning modal
// ─────────────────────────────────────────────────────────
function RoleChangeWarningModal({
  pendingChange,
  isUpdating,
  onCancel,
  onConfirm,
}) {
  const user = pendingChange?.user
  const previousRole = pendingChange?.previousRole
  const nextRole = pendingChange?.nextRole

  return (
    <Modal
      show={Boolean(pendingChange)}
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
            className='d-flex align-items-center justify-content-center rounded-circle bg-orange-100 text-orange-600'
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
            }}
          >
            <i className='bi bi-exclamation-triangle-fill' />
          </span>

          Xác nhận thay đổi vai trò
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className='pt-3'>
        <div className='rounded-4 border border-orange-200 bg-orange-50 p-4'>
          <p className='mb-2 font-black text-orange-900'>
            Thay đổi vai trò sẽ làm thay đổi quyền truy cập của tài khoản.
          </p>

          <p className='mb-0 text-sm leading-relaxed text-orange-800'>
            Người dùng có thể được cấp thêm hoặc mất quyền truy cập
            vào các chức năng quản trị ngay sau khi cập nhật.
          </p>
        </div>

        <div className='mt-4 rounded-4 border border-slate-200 p-3'>
          <div className='d-flex align-items-center gap-3'>
            <Avatar
              user={user}
              size={46}
            />

            <div className='min-w-0'>
              <p className='mb-0 font-black text-slate-900'>
                {user?.name || 'Người dùng'}
              </p>

              <p className='mb-0 text-sm text-slate-500'>
                {user?.email || '—'}
              </p>
            </div>
          </div>

          <div className='mt-4 d-flex align-items-center justify-content-center gap-3'>
            <div className='min-w-0 flex-grow-1 rounded-3 bg-slate-100 p-3 text-center'>
              <p className='mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400'>
                Vai trò hiện tại
              </p>

              <p className='mb-0 text-sm font-black text-slate-700'>
                {getRoleLabel(previousRole)}
              </p>
            </div>

            <span className='text-xl font-black text-orange-500'>
              →
            </span>

            <div className='min-w-0 flex-grow-1 rounded-3 bg-orange-50 p-3 text-center'>
              <p className='mb-1 text-[10px] font-black uppercase tracking-wider text-orange-400'>
                Vai trò mới
              </p>

              <p className='mb-0 text-sm font-black text-orange-700'>
                {getRoleLabel(nextRole)}
              </p>
            </div>
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
          Hủy thay đổi
        </Button>

        <Button
          type='button'
          onClick={onConfirm}
          disabled={isUpdating}
        >
          {isUpdating
            ? 'Đang cập nhật...'
            : 'Xác nhận đổi vai trò'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Create modal
// ─────────────────────────────────────────────────────────
function UserCreateModal({
  show,
  onHide,
  roles,
  onRefresh,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '',
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (
      show &&
      roles.length > 0 &&
      !form.role_id
    ) {
      const defaultRole =
        roles.find(
          (role) => role.code === 'CUSTOMER',
        ) || roles[0]

      setForm((previous) => ({
        ...previous,
        role_id: getId(defaultRole),
      }))
    }
  }, [
    show,
    roles,
    form.role_id,
  ])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.role_id
    ) {
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await createUser({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })

      await onRefresh()
      onHide()

      setForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role_id: form.role_id,
      })
    } catch (createError) {
      setError(
        getErrorMessage(
          createError,
          'Không thể tạo tài khoản.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size='md'
    >
      <Modal.Header
        closeButton={!submitting}
        className='border-0 pb-0'
      >
        <Modal.Title
          style={{
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Tạo tài khoản mới
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className='pt-2'>
        {error && (
          <Alert
            type='danger'
            className='mb-3 p-2 text-sm'
          >
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <TextField
            label='Họ và tên'
            placeholder='Ví dụ: Nguyễn Văn A'
            value={form.name}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            className='mb-3'
            required
          />

          <TextField
            label='Email đăng nhập'
            type='email'
            placeholder='admin@example.com'
            value={form.email}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                email: event.target.value,
              }))
            }
            className='mb-3'
            required
          />

          <TextField
            label='Số điện thoại (tùy chọn)'
            type='text'
            placeholder='Ví dụ: 0912345678'
            value={form.phone}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                phone: event.target.value,
              }))
            }
            className='mb-3'
          />

          <TextField
            label='Mật khẩu'
            type='password'
            placeholder='Mật khẩu ít nhất 6 ký tự'
            value={form.password}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                password: event.target.value,
              }))
            }
            className='mb-3'
            required
          />

          <SelectField
            label='Phân quyền (Vai trò)'
            value={form.role_id}
            options={roles.map((role) => ({
              value: getId(role),
              label: getRoleLabel(role),
            }))}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                role_id: event.target.value,
              }))
            }
            className='mb-4'
          />

          <div className='d-flex justify-content-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onHide}
              disabled={submitting}
            >
              Hủy
            </Button>

            <Button
              type='submit'
              disabled={submitting}
            >
              {submitting
                ? 'Đang tạo...'
                : 'Tạo tài khoản'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [detailUser, setDetailUser] = useState(null)

  const [pendingRoleChange, setPendingRoleChange] =
    useState(null)

  const [isChangingRole, setIsChangingRole] =
    useState(false)

  const roleMap = useMemo(() => {
    const map = new Map()

    roles.forEach((role) => {
      map.set(String(getId(role)), role)
    })

    return map
  }, [roles])

  const loadRoles = async () => {
    try {
      const response = await api.get('/role')
      setRoles(
        pickArray(
          response?.data || response,
          [],
        ),
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được danh sách vai trò.',
        ),
      )
    }
  }

  const loadData = async (
    silent = false,
  ) => {
    try {
      if (!silent) {
        setError('')
      }

      const response = await getUsers(
        query
          ? {
              q: query,
            }
          : {},
      )

      const nextUsers = pickArray(
        response,
        [],
      )

      setUsers(nextUsers)

      setDetailUser((previous) => {
        if (!previous) return null

        return (
          nextUsers.find(
            (item) =>
              String(getId(item)) ===
              String(getId(previous)),
          ) || previous
        )
      })

      return nextUsers
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được danh sách người dùng.',
        ),
      )

      return []
    }
  }

  useEffect(() => {
    loadRoles()
    loadData()
  }, [])

  const handleRequestRoleChange = (
    user,
    nextRoleId,
  ) => {
    const previousRoleId = getRoleId(user)

    if (
      !nextRoleId ||
      String(nextRoleId) ===
        String(previousRoleId)
    ) {
      return
    }

    const nextRole =
      roleMap.get(String(nextRoleId))

    const previousRole =
      roleMap.get(String(previousRoleId)) ||
      user.role_id ||
      user.role ||
      {
        name: getRoleName(user),
      }

    if (!nextRole) {
      setError('Không tìm thấy vai trò đã chọn.')
      return
    }

    setPendingRoleChange({
      user,
      previousRole,
      nextRole,
    })
  }

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return

    const targetUser =
      pendingRoleChange.user

    const nextRole =
      pendingRoleChange.nextRole

    const targetUserId =
      getId(targetUser)

    const nextRoleId =
      getId(nextRole)

    try {
      setIsChangingRole(true)
      setError('')
      setSuccessMessage('')

      await updateUser(
        targetUserId,
        {
          role_id: nextRoleId,
        },
      )

      const updatedRole = {
        ...nextRole,
      }

      setUsers((previous) =>
        previous.map((item) =>
          String(getId(item)) ===
          String(targetUserId)
            ? {
                ...item,
                role_id: updatedRole,
              }
            : item,
        ),
      )

      setDetailUser((previous) =>
        previous &&
        String(getId(previous)) ===
          String(targetUserId)
          ? {
              ...previous,
              role_id: updatedRole,
            }
          : previous,
      )

      setPendingRoleChange(null)

      setSuccessMessage(
        `Đã đổi vai trò của "${targetUser.name || targetUser.email}" thành ${getRoleLabel(nextRole)}.`,
      )

      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)

      await loadData(true)
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
          'Không thể thay đổi vai trò.',
        ),
      )
    } finally {
      setIsChangingRole(false)
    }
  }

  return (
    <DashboardLayout
      title='Quản lý Người Dùng'
      description='Trung tâm quản lý toàn bộ tài khoản trong hệ thống.'
    >
      {error && (
        <Alert type='danger'>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          type='success'
          className='mb-4'
        >
          {successMessage}
        </Alert>
      )}

      <Card className='card-surface mb-4 rounded-4 border-0 shadow-sm'>
        <Card.Body className='d-flex flex-column align-items-md-center justify-content-between gap-3 p-4 flex-md-row'>
          <div
            className='d-flex flex-grow-1 gap-2'
            style={{
              maxWidth: 430,
            }}
          >
            <TextField
              placeholder='Tìm theo tên, email, số điện thoại...'
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  loadData(false)
                }
              }}
              className='mb-0 flex-grow-1'
            />

            <Button
              onClick={() => loadData(false)}
              className='px-4'
            >
              Tìm kiếm
            </Button>
          </div>

          <Button
            onClick={() => setShowCreate(true)}
            className='px-4 py-2'
            style={{
              fontWeight: 700,
            }}
          >
            + Thêm tài khoản
          </Button>
        </Card.Body>
      </Card>

      <Card className='card-surface overflow-hidden rounded-4 border-0 shadow-sm'>
        <Card.Body className='p-0'>
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
                  Người dùng
                </th>

                <th
                  className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'
                  style={{
                    minWidth: 230,
                  }}
                >
                  Vai trò
                </th>

                <th className='border-0 p-4 text-xs font-black uppercase tracking-wider text-slate-400'>
                  Trạng thái
                </th>

                <th className='border-0 p-4 text-end text-xs font-black uppercase tracking-wider text-slate-400'>
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => {
                const currentRoleId =
                  getRoleId(user)

                return (
                  <tr
                    key={getId(user)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <td className='p-4'>
                      <div className='d-flex align-items-center gap-3'>
                        <Avatar
                          user={user}
                          size={46}
                        />

                        <div className='min-w-0'>
                          <div
                            className='text-truncate font-bold text-slate-900'
                            style={{
                              maxWidth: 300,
                              fontSize: 15,
                            }}
                          >
                            {user.name || 'Chưa có tên'}
                          </div>

                          <div
                            className='text-truncate text-slate-500'
                            style={{
                              maxWidth: 300,
                              fontSize: 13,
                            }}
                          >
                            {user.email || 'Chưa có email'}
                          </div>

                          {user.phone && (
                            <div
                              className='mt-1 text-slate-400'
                              style={{
                                fontSize: 12,
                              }}
                            >
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className='p-4'>
                      <Form.Select
                        value={currentRoleId}
                        onChange={(event) =>
                          handleRequestRoleChange(
                            user,
                            event.target.value,
                          )
                        }
                        disabled={
                          roles.length === 0 ||
                          isChangingRole
                        }
                        className='rounded-3 border-slate-200 text-sm font-bold text-slate-700 shadow-none'
                        style={{
                          minWidth: 205,
                          cursor:
                            roles.length === 0
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                        aria-label={`Thay đổi vai trò của ${user.name || user.email}`}
                      >
                        {!currentRoleId && (
                          <option value=''>
                            Chọn vai trò
                          </option>
                        )}

                        {roles.map((role) => (
                          <option
                            key={getId(role)}
                            value={getId(role)}
                          >
                            {getRoleLabel(role)}
                          </option>
                        ))}
                      </Form.Select>
                    </td>

                    <td className='p-4'>
                      <StatusPill value={user.status} />
                    </td>

                    <td className='p-4 text-end'>
                      <Button
                        size='sm'
                        variant='light'
                        onClick={() =>
                          setDetailUser(user)
                        }
                        className='px-3'
                        style={{
                          fontWeight: 700,
                          color: '#3b82f6',
                          background: '#eff6ff',
                        }}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className='p-5 text-center font-medium text-slate-400'
                  >
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <RoleChangeWarningModal
        pendingChange={pendingRoleChange}
        isUpdating={isChangingRole}
        onCancel={() => {
          if (!isChangingRole) {
            setPendingRoleChange(null)
          }
        }}
        onConfirm={handleConfirmRoleChange}
      />

      <UserCreateModal
        show={showCreate}
        onHide={() => {
          if (!showCreate) return
          setShowCreate(false)
        }}
        roles={roles}
        onRefresh={async () => {
          await loadData(true)

          setSuccessMessage(
            'Tạo tài khoản thành công.',
          )

          setTimeout(() => {
            setSuccessMessage('')
          }, 5000)
        }}
      />

      <UserDetailModal
        show={Boolean(detailUser)}
        onHide={() => setDetailUser(null)}
        user={detailUser}
        onRefresh={() => loadData(true)}
      />
    </DashboardLayout>
  )
}

export default UserManagementPage
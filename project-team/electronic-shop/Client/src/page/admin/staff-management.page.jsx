import { useEffect, useState, useMemo } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import DashboardLayout from '../../components/templates/DashboardLayout'
import LoadingText from '../../components/atoms/LoadingText'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'

import { getErrorMessage } from '../../services/api'
import { getStaffList, createStaff, toggleStaffStatus, getStaffPerformance } from '../../services/manager.service'
import { formatDate, getId, pickArray } from '../../utils/format'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const formatDateTime = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))
}

const getInitials = (name = '') =>
  name.trim().split(' ').slice(-2).map((w) => w[0]?.toUpperCase() || '').join('')

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

const STATUS_MAP = {
  active:   { label: 'Hoạt động',       bg: '#dcfce7', color: '#16a34a' },
  blocked:  { label: 'Đã khóa',         bg: '#fee2e2', color: '#dc2626' },
  inactive: { label: 'Không hoạt động', bg: '#f1f5f9', color: '#64748b' },
}

function StatusPill({ value }) {
  const cfg = STATUS_MAP[String(value || '').toLowerCase()] || { label: value || '—', bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  const [imgErr, setImgErr] = useState(false)
  const src = user?.avatar_url || user?.img_url || user?.avatar || ''
  const colorIdx = (user?.name || '').charCodeAt(0) % AVATAR_COLORS.length

  if (src && !imgErr) {
    return (
      <img src={src} alt={user?.name} onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e2e8f0' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: AVATAR_COLORS[colorIdx], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.38, userSelect: 'none',
    }}>
      {getInitials(user?.name) || '?'}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Info Row
// ─────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 15, width: 22, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b', wordBreak: 'break-all' }}>{value || '—'}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Detail Modal — xem hồ sơ + lock/unlock
// ─────────────────────────────────────────────────────────
function StaffDetailModal({ show, onHide, staff, onToggleStatus, togglingId }) {
  const [perf, setPerf] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfErr, setPerfErr] = useState('')

  useEffect(() => {
    if (!show || !staff) return
    let mounted = true
    setPerfLoading(true)
    setPerfErr('')
    setPerf(null)
    getStaffPerformance(getId(staff))
      .then((res) => { if (mounted) setPerf(res?.data ?? res) })
      .catch((e) => { if (mounted) setPerfErr(getErrorMessage(e, 'Không tải được hiệu suất')) })
      .finally(() => { if (mounted) setPerfLoading(false) })
    return () => { mounted = false }
  }, [show, staff])

  if (!staff) return null

  const id = getId(staff)
  const isBlocked = String(staff.status || '').toLowerCase() === 'blocked'
  const roleLabel = staff.role_id?.name || staff.role_id?.code || 'STAFF'
  const lastLogin = staff.last_login || staff.lastLogin || staff.last_login_at || null

  return (
    <Modal show={show} onHide={onHide} centered size='md'>
      <Modal.Header closeButton style={{ border: 'none', paddingBottom: 4 }}>
        <Modal.Title style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Hồ sơ nhân viên</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '4px 24px 20px', maxHeight: '75vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0 16px', borderBottom: '2px solid #f1f5f9', marginBottom: 4 }}>
          <Avatar user={staff} size={60} />
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{staff.name || '—'}</h5>
            <p style={{ margin: '2px 0 6px', fontSize: 13, color: '#64748b' }}>{staff.email || '—'}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusPill value={staff.status || 'active'} />
              <span style={{ fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#3b82f6', padding: '3px 10px', borderRadius: 20 }}>{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Last login */}
        <div style={{
          background: lastLogin ? 'linear-gradient(135deg,#eff6ff,#f0fdf4)' : '#f8fafc',
          border: `1px solid ${lastLogin ? '#bfdbfe' : '#e2e8f0'}`,
          borderRadius: 12, padding: '12px 16px', margin: '12px 0',
        }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em' }}>🕐 Đăng nhập lần cuối</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: lastLogin ? '#1e293b' : '#94a3b8' }}>
            {lastLogin ? formatDateTime(lastLogin) : 'Chưa có dữ liệu'}
          </p>
        </div>

        {/* Performance */}
        <p style={{ margin: '14px 0 4px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hiệu suất xử lý đơn hàng</p>
        {perfLoading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Đang tải...</p>}
        {perfErr && <p style={{ fontSize: 12, color: '#ef4444' }}>{perfErr}</p>}
        {perf && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#3b82f6' }}>{perf?.performance?.total_handled_orders ?? '—'}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 700 }}>Đơn đã xử lý</p>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#10b981' }}>{perf?.performance?.average_handling_time_text ?? '—'}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 700 }}>TG xử lý TB</p>
            </div>
          </div>
        )}

        {/* Account info */}
        <p style={{ margin: '14px 0 4px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Thông tin tài khoản</p>
        <InfoRow icon='🆔' label='Mã nhân viên' value={String(id).slice(-12).toUpperCase()} />
        <InfoRow icon='📛' label='Họ và tên' value={staff.name} />
        <InfoRow icon='📧' label='Email' value={staff.email} />
        <InfoRow icon='📱' label='Số điện thoại' value={staff.phone || staff.phone_number} />
        <InfoRow icon='🎂' label='Ngày sinh' value={formatDate(staff.date_of_birth || staff.dob)} />
        <InfoRow icon='⚥'  label='Giới tính' value={staff.gender === 'male' ? 'Nam' : staff.gender === 'female' ? 'Nữ' : staff.gender} />
        <InfoRow icon='📅' label='Ngày tạo tài khoản' value={formatDateTime(staff.created_at || staff.createdAt)} />
        <InfoRow icon='🔄' label='Cập nhật lần cuối' value={formatDateTime(staff.updated_at || staff.updatedAt)} />
      </Modal.Body>

      <Modal.Footer style={{ border: 'none', paddingTop: 0, gap: 8 }}>
        {/* Nút khóa / mở khóa */}
        <button
          disabled={togglingId === id}
          onClick={() => onToggleStatus(staff)}
          style={{
            padding: '7px 16px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            background: isBlocked ? '#dcfce7' : '#fee2e2',
            color: isBlocked ? '#16a34a' : '#dc2626',
            opacity: togglingId === id ? 0.6 : 1,
          }}
        >
          {togglingId === id ? 'Đang xử lý...' : isBlocked ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
        </button>
        <Button variant='light' onClick={onHide}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Create Staff Modal
// ─────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '', phone: '' }

function CreateStaffModal({ show, onHide, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (show) { setForm(EMPTY_FORM); setErrors({}); setApiErr('') }
  }, [show])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên'
    if (!form.email.trim()) e.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu'
    else if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Mật khẩu xác nhận không khớp'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setApiErr('')
    try {
      await createStaff({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() || undefined })
      onCreated()
      onHide()
    } catch (err) {
      setApiErr(getErrorMessage(err, 'Tạo tài khoản thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = (err) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`, outline: 'none',
    background: err ? '#fff5f5' : '#fff', color: '#1e293b', boxSizing: 'border-box',
  })

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }
  const errStyle = { fontSize: 11, color: '#ef4444', fontWeight: 700, marginTop: 3 }

  return (
    <Modal show={show} onHide={onHide} centered size='md'>
      <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
        <Modal.Title style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>➕ Thêm tài khoản nhân viên</Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: '12px 24px 8px' }}>
          {apiErr && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{apiErr}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Họ tên */}
            <div>
              <label style={labelStyle}>Họ và tên <span style={{ color: '#ef4444' }}>*</span></label>
              <input id='staff-name' style={fieldStyle(errors.name)} placeholder='Nguyễn Văn A' value={form.name} onChange={set('name')} />
              {errors.name && <p style={errStyle}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input id='staff-email' type='email' style={fieldStyle(errors.email)} placeholder='nhanvien@techsale.vn' value={form.email} onChange={set('email')} />
              {errors.email && <p style={errStyle}>{errors.email}</p>}
            </div>

            {/* SĐT */}
            <div>
              <label style={labelStyle}>Số điện thoại</label>
              <input id='staff-phone' type='tel' style={fieldStyle()} placeholder='09xxxxxxxx' value={form.phone} onChange={set('phone')} />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Mật khẩu <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input id='staff-password' type={showPass ? 'text' : 'password'} style={{ ...fieldStyle(errors.password), paddingRight: 40 }}
                  placeholder='Tối thiểu 6 ký tự' value={form.password} onChange={set('password')} />
                <button type='button' onClick={() => setShowPass((v) => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p style={errStyle}>{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label style={labelStyle}>Xác nhận mật khẩu <span style={{ color: '#ef4444' }}>*</span></label>
              <input id='staff-confirm-password' type='password' style={fieldStyle(errors.confirmPassword)}
                placeholder='Nhập lại mật khẩu' value={form.confirmPassword} onChange={set('confirmPassword')} />
              {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword}</p>}
            </div>

            {/* Info note */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>
                ℹ️ Tài khoản sẽ được tạo với vai trò <b>Nhân viên (STAFF)</b> và trạng thái <b>Hoạt động</b>.
              </p>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer style={{ border: 'none', paddingTop: 8 }}>
          <Button variant='light' type='button' onClick={onHide}>Hủy</Button>
          <Button type='submit' isLoading={loading}>✓ Tạo tài khoản</Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
function StaffManagementPage() {
  const [staffList, setStaffList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      setError('')
      const res = await getStaffList()
      const list = res?.data ?? pickArray(res, [])
      setStaffList(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(getErrorMessage(e, 'Không tải được danh sách nhân viên'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Tự tắt thông báo sau 4s
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(t)
  }, [success])

  const filtered = useMemo(() =>
    staffList.filter((u) => {
      const matchSearch = !search ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search)
      const matchStatus = !filterStatus || String(u.status || '').toLowerCase() === filterStatus
      return matchSearch && matchStatus
    }),
  [staffList, search, filterStatus])

  const handleToggleStatus = async (staff) => {
    const id = getId(staff)
    const newStatus = String(staff.status || '').toLowerCase() === 'blocked' ? 'active' : 'blocked'
    setTogglingId(id)
    setError('')
    try {
      await toggleStaffStatus(id, newStatus)
      setSuccess(newStatus === 'blocked' ? `Đã khóa tài khoản ${staff.name}` : `Đã mở khóa tài khoản ${staff.name}`)
      await load()
      // Cập nhật staff đang mở trong modal nếu cùng người
      setSelectedStaff((prev) => prev && getId(prev) === id ? { ...prev, status: newStatus } : prev)
    } catch (e) {
      setError(getErrorMessage(e, 'Không thể cập nhật trạng thái'))
    } finally {
      setTogglingId('')
    }
  }

  const activeCount  = staffList.filter((u) => String(u.status || '').toLowerCase() === 'active').length
  const blockedCount = staffList.filter((u) => String(u.status || '').toLowerCase() === 'blocked').length

  return (
    <DashboardLayout
      title='Quản lý nhân viên'
      description='Danh sách nhân viên STAFF — xem thông tin, thêm tài khoản và quản lý trạng thái.'
    >
      {error   && <Alert type='danger'>{error}</Alert>}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className='d-flex gap-3 flex-wrap mb-4'>
        {[
          { icon: '👥', label: 'Tổng nhân viên', value: staffList.length, accent: '#3b82f6' },
          { icon: '✅', label: 'Đang hoạt động', value: activeCount,      accent: '#16a34a' },
          { icon: '🔒', label: 'Đã khóa',        value: blockedCount,     accent: '#ef4444' },
        ].map((s, i) => (
          <div key={i} style={{ flex: '1 1 150px', background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: s.accent }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Add button */}
      <Card className='border-0 shadow-sm mb-3' style={{ borderRadius: 12 }}>
        <Card.Body className='p-3'>
          <div className='d-flex gap-2 flex-wrap align-items-center'>
            <TextField
              placeholder='🔍 Tìm theo tên, email, SĐT...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 270 }}
            />
            <Form.Select size='sm' style={{ maxWidth: 170 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value=''>Tất cả trạng thái</option>
              <option value='active'>Hoạt động</option>
              <option value='blocked'>Đã khóa</option>
              <option value='inactive'>Không hoạt động</option>
            </Form.Select>
            {(search || filterStatus) && (
              <button onClick={() => { setSearch(''); setFilterStatus('') }}
                style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                ✕ Xóa lọc
              </button>
            )}
            <span className='ms-auto text-slate-400 fw-bold' style={{ fontSize: 13 }}>{filtered.length} nhân viên</span>
            {/* Nút thêm tài khoản */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#3b82f6', color: '#fff', border: 'none',
                borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> Thêm nhân viên
            </button>
          </div>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className='border-0 shadow-sm' style={{ borderRadius: 12 }}>
        <Card.Body className='p-0'>
          {isLoading ? (
            <div className='p-5'><LoadingText /></div>
          ) : filtered.length === 0 ? (
            <div className='text-center py-5' style={{ color: '#94a3b8' }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>👤</div>
              <p className='fw-bold mb-1' style={{ fontSize: 14 }}>
                {staffList.length === 0 ? 'Chưa có nhân viên nào trong hệ thống' : 'Không tìm thấy nhân viên phù hợp'}
              </p>
              {staffList.length === 0 && (
                <button onClick={() => setShowCreate(true)}
                  style={{ marginTop: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  + Thêm nhân viên đầu tiên
                </button>
              )}
            </div>
          ) : (
            <Table responsive hover className='mb-0 align-middle'>
              <thead style={{ background: '#f8fafc' }}>
                <tr style={{ fontSize: 12 }}>
                  <th className='p-3 border-0' style={{ color: '#64748b', fontWeight: 700 }}>#</th>
                  <th className='p-3 border-0' style={{ color: '#64748b', fontWeight: 700 }}>Nhân viên</th>
                  <th className='border-0' style={{ color: '#64748b', fontWeight: 700 }}>Liên hệ</th>
                  <th className='border-0' style={{ color: '#64748b', fontWeight: 700 }}>Trạng thái</th>
                  <th className='border-0' style={{ color: '#64748b', fontWeight: 700 }}>Ngày tạo</th>
                  <th className='border-0 text-center' style={{ color: '#64748b', fontWeight: 700, minWidth: 220 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => {
                  const id = getId(user)
                  const isBlocked = String(user.status || '').toLowerCase() === 'blocked'
                  const isToggling = togglingId === id
                  return (
                    <tr key={id} style={{ cursor: 'default' }}>
                      <td className='p-3' style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>

                      <td className='p-3'>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar user={user} size={40} />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{user.name || '—'}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>#{String(id).slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569', fontWeight: 600 }}>{user.email || '—'}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{user.phone || '—'}</p>
                      </td>

                      <td><StatusPill value={user.status || 'active'} /></td>

                      <td style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                        {formatDate(user.created_at || user.createdAt)}
                      </td>

                      <td className='text-center'>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Xem chi tiết */}
                          <button onClick={() => setSelectedStaff(user)}
                            style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                            Xem
                          </button>
                          {/* Khóa / Mở khóa */}
                          <button
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(user)}
                            style={{
                              border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                              background: isBlocked ? '#dcfce7' : '#fee2e2',
                              color: isBlocked ? '#16a34a' : '#dc2626',
                              opacity: isToggling ? 0.6 : 1,
                            }}>
                            {isToggling ? '...' : isBlocked ? '🔓 Mở khóa' : '🔒 Khóa'}
                          </button>
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

      {/* Create modal */}
      <CreateStaffModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        onCreated={() => { setSuccess('Tạo tài khoản nhân viên thành công!'); load() }}
      />

      {/* Detail modal */}
      <StaffDetailModal
        show={!!selectedStaff}
        onHide={() => setSelectedStaff(null)}
        staff={selectedStaff}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />
    </DashboardLayout>
  )
}

export default StaffManagementPage

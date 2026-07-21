import { useEffect, useState, useMemo } from 'react'
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
import { getUsers, createUser, updateUser } from '../../services/user.service'
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
  blocked:  { label: 'Bị khóa',         bg: '#fee2e2', color: '#dc2626' },
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
// Detail & Update Modal
// ─────────────────────────────────────────────────────────
function UserDetailModal({ show, onHide, user, roles, onRefresh }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role_id: ''
  })

  useEffect(() => {
    if (show && user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        role_id: user.role_id?._id || user.role_id || ''
      })
      setEditMode(false)
      setError('')
      setSuccess('')
    }
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
      await updateUser(getId(user), formData)
      setSuccess('Cập nhật tài khoản thành công!')
      setEditMode(false)
      onRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Lỗi cập nhật'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleStatus = async () => {
    try {
      setIsUpdating(true)
      setError('')
      const nextStatus = user.status === 'active' ? 'blocked' : 'active'
      await updateUser(getId(user), { status: nextStatus })
      onRefresh()
      onHide()
    } catch (err) {
      setError(getErrorMessage(err, 'Lỗi cập nhật trạng thái'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user) return null

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title style={{ fontSize: 18, fontWeight: 800 }}>Chi tiết Tài Khoản</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-3">
        {error && <Alert type="danger" className="mb-3 p-2 text-sm">{error}</Alert>}
        {success && <Alert type="success" className="mb-3 p-2 text-sm">{success}</Alert>}

        <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-4 bg-slate-50 border">
          <Avatar user={user} size={64} />
          <div>
            <h5 style={{ fontWeight: 800, margin: 0 }}>{user.name}</h5>
            <p className="text-slate-500 mb-2" style={{ fontSize: 14, fontWeight: 500 }}>{user.email}</p>
            <StatusPill value={user.status} />
          </div>
        </div>

        {!editMode ? (
          <div className="px-1">
            <InfoRow icon="👤" label="Họ và tên" value={user.name} />
            <InfoRow icon="🛡️" label="Vai trò" value={user.role_id?.name || '—'} />
            <InfoRow icon="🕒" label="Ngày tham gia" value={formatDateTime(user.created_at)} />
            <InfoRow icon="📱" label="Số điện thoại" value={user.phone || '—'} />
          </div>
        ) : (
          <div className="px-1">
            <TextField 
              label="Họ và tên"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mb-3"
            />
            <TextField 
              label="Số điện thoại"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="mb-3"
            />
            <SelectField
              label="Vai trò"
              value={formData.role_id}
              options={roles.map(r => ({ value: r._id, label: r.name }))}
              onChange={(e) => setFormData({...formData, role_id: e.target.value})}
              className="mb-3"
            />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 justify-content-between">
        {!editMode ? (
          <>
            <Button
              variant={user.status === 'active' ? 'danger-subtle' : 'success-subtle'}
              onClick={handleToggleStatus}
              disabled={isUpdating}
            >
              <span className="fw-bold">{user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</span>
            </Button>
            <div className="d-flex gap-2">
              <Button variant="outline" onClick={onHide}>Đóng</Button>
              <Button onClick={() => setEditMode(true)}>Chỉnh sửa</Button>
            </div>
          </>
        ) : (
          <div className="d-flex justify-content-end w-100 gap-2">
            <Button variant="outline" onClick={() => setEditMode(false)} disabled={isUpdating}>Hủy</Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>Lưu thay đổi</Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Create Modal
// ─────────────────────────────────────────────────────────
function UserCreateModal({ show, onHide, roles, onRefresh }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role_id: '' })
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto select role customer by default if available
  useEffect(() => {
    if (show && roles.length > 0 && !form.role_id) {
      const defaultRole = roles.find(r => r.code === 'CUSTOMER') || roles[0]
      setForm(prev => ({ ...prev, role_id: defaultRole._id }))
    }
  }, [show, roles])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.role_id) {
      return setErr('Vui lòng nhập đầy đủ thông tin.')
    }
    try {
      setSubmitting(true)
      setErr('')
      await createUser(form)
      onRefresh()
      onHide()
      setForm({ name: '', email: '', password: '', phone: '', role_id: form.role_id })
    } catch (error) {
      setErr(getErrorMessage(error, 'Không thể tạo tài khoản.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title style={{ fontSize: 18, fontWeight: 800 }}>Tạo tài khoản mới</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        {err && <Alert type="danger" className="p-2 mb-3 text-sm">{err}</Alert>}
        <Form onSubmit={handleSubmit}>
          <TextField 
            label="Họ và tên" 
            placeholder="Ví dụ: Nguyễn Văn A"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} 
            className="mb-3"
            required 
          />
          <TextField 
            label="Email đăng nhập" 
            type="email"
            placeholder="admin@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} 
            className="mb-3"
            required 
          />
          <TextField 
            label="Số điện thoại (tùy chọn)" 
            type="text"
            placeholder="Ví dụ: 0912345678"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            className="mb-3"
          />
          <TextField 
            label="Mật khẩu" 
            type="text"
            placeholder="Mật khẩu ít nhất 6 ký tự"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} 
            className="mb-3"
            required 
          />
          <SelectField
            label="Phân quyền (Vai trò)"
            value={form.role_id}
            options={roles.map(r => ({ value: r._id, label: r.name }))}
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            className="mb-4"
          />
          <div className="d-flex justify-content-end gap-2">
            <Button type="button" variant="outline" onClick={onHide} disabled={submitting}>Hủy</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [detailUser, setDetailUser] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const loadRoles = async () => {
    try {
      const res = await api.get('/role')
      setRoles(pickArray(res?.data || res, []))
    } catch (e) {
      console.error("Lỗi lấy danh sách Roles", e)
    }
  }

  const loadData = async (silent = false) => {
    try {
      if (!silent) setError('')
      const res = await getUsers(query ? { q: query } : {})
      setUsers(pickArray(res, []))
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách người dùng'))
    }
  }

  useEffect(() => {
    loadRoles()
    loadData()
  }, [])

  return (
    <DashboardLayout 
      title="Quản lý Người Dùng" 
      description="Trung tâm quản lý toàn bộ tài khoản trong hệ thống."
    >
      {error && <Alert type="danger">{error}</Alert>}
      {successMsg && <Alert type="success" className="mb-4">{successMsg}</Alert>}

      <Card className="card-surface mb-4 border-0 shadow-sm rounded-4">
        <Card.Body className="p-4 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center">
          <div className="d-flex gap-2 flex-grow-1" style={{ maxWidth: 400 }}>
            <TextField 
              placeholder="Tìm theo tên, email..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="flex-grow-1 mb-0" 
            />
            <Button onClick={() => loadData(false)} className="px-4">Tìm kiếm</Button>
          </div>
          <Button onClick={() => setShowCreate(true)} className="px-4 py-2" style={{ fontWeight: 700 }}>
            + Thêm tài khoản
          </Button>
        </Card.Body>
      </Card>

      <Card className="card-surface border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th className="p-4 border-0 text-xs font-black text-slate-400 uppercase tracking-wider">Người dùng</th>
                <th className="p-4 border-0 text-xs font-black text-slate-400 uppercase tracking-wider">Vai trò</th>
                <th className="p-4 border-0 text-xs font-black text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="p-4 border-0 text-xs font-black text-slate-400 uppercase tracking-wider text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={getId(user)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="p-4">
                    <div className="d-flex align-items-center gap-3">
                      <Avatar user={user} size={42} />
                      <div>
                        <div className="font-bold text-slate-900" style={{ fontSize: 15 }}>{user.name}</div>
                        <div className="text-slate-500" style={{ fontSize: 13 }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
                      {user.role_id?.name || user.role_id?.code || '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <StatusPill value={user.status} />
                  </td>
                  <td className="p-4 text-end">
                    <Button 
                      size="sm" 
                      variant="light"
                      onClick={() => setDetailUser(user)}
                      className="px-3"
                      style={{ fontWeight: 700, color: '#3b82f6', background: '#eff6ff' }}
                    >
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-5 text-center text-slate-400 font-medium">
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <UserCreateModal 
        show={showCreate} 
        onHide={() => setShowCreate(false)} 
        roles={roles}
        onRefresh={() => {
          loadData(true)
          setSuccessMsg('Tạo tài khoản thành công!')
          setTimeout(() => setSuccessMsg(''), 5000)
        }} 
      />
      <UserDetailModal 
        show={!!detailUser} 
        onHide={() => setDetailUser(null)} 
        user={detailUser}
        roles={roles}
        onRefresh={() => {
          loadData(true)
          setDetailUser(null)
        }} 
      />
    </DashboardLayout>
  )
}

export default UserManagementPage

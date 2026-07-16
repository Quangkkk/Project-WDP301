import { useEffect, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import LoadingText from '../../components/atoms/LoadingText'
import api, { getErrorMessage } from '../../services/api'
import { getId } from '../../utils/format'

function RolePermissionManagementPage() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedRolePerms, setSelectedRolePerms] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isPermsLoading, setIsPermsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Form states cho Role moi
  const [newRole, setNewRole] = useState({ code: '', name: '', description: '' })
  const [isCreatingRole, setIsCreatingRole] = useState(false)

  // Form states cho Permission moi
  const [newPerm, setNewPerm] = useState({ code: '', name: '', description: '' })
  const [isCreatingPerm, setIsCreatingPerm] = useState(false)

  // Tai toan bo roles va permissions luc khoi chay
  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      setError('')
      setMessage('')

      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
      ])

      const roleList = rolesRes.data?.data || []
      setRoles(roleList)
      setPermissions(permsRes.data?.data || [])

      if (roleList.length > 0 && !selectedRoleId) {
        setSelectedRoleId(getId(roleList[0]))
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Khong tai duoc thong tin Roles/Permissions.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Tai danh sach quyen (permissions) cua Role dang chon
  const loadRolePermissions = async (roleId) => {
    if (!roleId) return
    try {
      setIsPermsLoading(true)
      const res = await api.get(`/admin/roles/${roleId}/permissions`)
      setSelectedRolePerms(res.data?.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Khong tai duoc danh sach quyen cua role.'))
    } finally {
      setIsPermsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId)
    }
  }, [selectedRoleId])

  // Xu ly tao Role moi
  const handleCreateRole = async (e) => {
    e.preventDefault()
    if (!newRole.code || !newRole.name) return
    try {
      setIsCreatingRole(true)
      setError('')
      await api.post('/admin/roles', newRole)
      setNewRole({ code: '', name: '', description: '' })
      setMessage('Tao Role moi thanh cong.')
      await loadInitialData()
    } catch (err) {
      setError(getErrorMessage(err, 'Loi tao Role.'))
    } finally {
      setIsCreatingRole(false)
    }
  }

  // Xu ly tao Permission moi
  const handleCreatePerm = async (e) => {
    e.preventDefault()
    if (!newPerm.code || !newPerm.name) return
    try {
      setIsCreatingPerm(true)
      setError('')
      await api.post('/admin/permissions', newPerm)
      setNewPerm({ code: '', name: '', description: '' })
      setMessage('Tao Permission moi thanh cong.')
      await loadInitialData()
    } catch (err) {
      setError(getErrorMessage(err, 'Loi tao Permission.'))
    } finally {
      setIsCreatingPerm(false)
    }
  }

  // Tick/Untick phan quyen permission cho role hien tai
  const handlePermissionChange = async (permissionId, isChecked) => {
    if (!selectedRoleId) return
    try {
      setError('')
      setMessage('')
      if (isChecked) {
        // Them quyen vao role
        await api.post(`/admin/roles/${selectedRoleId}/permissions`, {
          permission_id: permissionId,
        })
      } else {
        // Go quyen khoi role
        await api.delete(`/admin/roles/${selectedRoleId}/permissions/${permissionId}`)
      }
      // Tai lai quyen hien tai cua role
      await loadRolePermissions(selectedRoleId)
    } catch (err) {
      setError(getErrorMessage(err, 'Loi cap nhat quyen cho vai tro.'))
    }
  }

  const selectedRole = roles.find((r) => getId(r) === selectedRoleId)

  return (
    <DashboardLayout title='Roles & Permissions' description='Admin quản trị vai trò hệ thống, tạo quyền hạn nâng cao và gán/gỡ quyên cho từng Role.'>
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      {isLoading ? (
        <LoadingText />
      ) : (
        <Row className='g-4'>
          {/* Cột trái: Quản lý Roles */}
          <Col lg={4}>
            <Card className='card-surface border-0 shadow-sm mb-4'>
              <Card.Header className='bg-white py-3 border-bottom border-slate-100'>
                <h3 className='m-0 text-base font-black text-slate-900'>Danh sách Roles</h3>
              </Card.Header>
              <div className='p-2 d-flex flex-column gap-1 bg-slate-50'>
                {roles.map((role) => {
                  const isSel = getId(role) === selectedRoleId
                  return (
                    <div
                      key={getId(role)}
                      onClick={() => setSelectedRoleId(getId(role))}
                      className={`p-3 rounded-4 cursor-pointer transition ${
                        isSel ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 border border-slate-100'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <h4 className={`text-sm font-black m-0 ${isSel ? 'text-white' : 'text-slate-900'}`}>{role.name}</h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isSel ? 'text-blue-200' : 'text-slate-400'}`}>
                        {role.code}
                      </span>
                      {role.description && (
                        <p className={`text-xs m-0 mt-1 ${isSel ? 'text-blue-100' : 'text-slate-500'}`}>{role.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Form tạo mới Role */}
            <Card className='card-surface border-0 shadow-sm'>
              <Card.Header className='bg-white py-3 border-bottom border-slate-100'>
                <h3 className='m-0 text-base font-black text-slate-900'>Tạo Role mới</h3>
              </Card.Header>
              <Card.Body className='p-3'>
                <Form onSubmit={handleCreateRole} className='d-flex flex-column gap-3'>
                  <Form.Group>
                    <Form.Label className='text-xs font-bold text-slate-500'>Mã vai trò (Vd: STAFF_SALES)</Form.Label>
                    <Form.Control
                      type='text'
                      value={newRole.code}
                      onChange={(e) => setNewRole((p) => ({ ...p, code: e.target.value }))}
                      placeholder='Mã code...'
                      className='shadow-none'
                      required
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label className='text-xs font-bold text-slate-500'>Tên vai trò (Vd: Nhân viên bán hàng)</Form.Label>
                    <Form.Control
                      type='text'
                      value={newRole.name}
                      onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                      placeholder='Tên vai trò...'
                      className='shadow-none'
                      required
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label className='text-xs font-bold text-slate-500'>Mô tả</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={2}
                      value={newRole.description}
                      onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                      placeholder='Mô tả ngắn...'
                      className='shadow-none'
                    />
                  </Form.Group>
                  <Button type='submit' size='sm' isLoading={isCreatingRole}>Tạo vai trò</Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Cột phải: Gán/gỡ Permissions cho Role đã chọn */}
          <Col lg={8}>
            {selectedRole ? (
              <Card className='card-surface border-0 shadow-sm mb-4'>
                <Card.Header className='bg-white py-3 border-bottom border-slate-100'>
                  <div className='d-flex justify-content-between align-items-center'>
                    <div>
                      <span className='text-xs font-bold text-blue-600 uppercase tracking-widest'>Thiết lập quyền hạn</span>
                      <h3 className='m-0 text-lg font-black text-slate-950 mt-1'>Vai trò: {selectedRole.name}</h3>
                    </div>
                    <span className='badge bg-blue-100 text-blue-800 uppercase font-black px-3 py-2 rounded-pill'>
                      {selectedRole.code}
                    </span>
                  </div>
                </Card.Header>
                <Card.Body className='p-3'>
                  {isPermsLoading ? (
                    <LoadingText />
                  ) : permissions.length === 0 ? (
                    <div className='text-center py-5 text-slate-400'>Chưa có quyền hạn nào được khai báo trong hệ thống.</div>
                  ) : (
                    <div className='d-flex flex-column gap-3'>
                      {permissions.map((perm) => {
                        const isAssigned = selectedRolePerms.some((rp) => getId(rp) === getId(perm))
                        return (
                          <div
                            key={getId(perm)}
                            className='d-flex align-items-start justify-content-between p-3 rounded-4 border border-slate-100 bg-slate-50 hover:bg-slate-100 transition'
                          >
                            <div className='d-flex align-items-start gap-3'>
                              <Form.Check
                                type='checkbox'
                                checked={isAssigned}
                                onChange={(e) => handlePermissionChange(getId(perm), e.target.checked)}
                                className='mt-1 shadow-none'
                                id={`perm-${getId(perm)}`}
                              />
                              <div>
                                <label htmlFor={`perm-${getId(perm)}`} className='font-black text-slate-900 text-sm cursor-pointer m-0'>
                                  {perm.name}
                                </label>
                                <span className='badge bg-slate-200 text-slate-600 text-[9px] ms-2 uppercase tracking-wide'>
                                  {perm.code}
                                </span>
                                {perm.description && <p className='text-xs text-slate-500 m-0 mt-1'>{perm.description}</p>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            ) : (
              <div className='h-100 rounded-4 border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-5 text-slate-400'>
                Hãy tạo hoặc chọn một Role từ danh sách bên trái để phân quyền.
              </div>
            )}

            {/* Form tạo mới Permission */}
            <Card className='card-surface border-0 shadow-sm'>
              <Card.Header className='bg-white py-3 border-bottom border-slate-100'>
                <h3 className='m-0 text-base font-black text-slate-900'>Khai báo Permission mới</h3>
              </Card.Header>
              <Card.Body className='p-3'>
                <Form onSubmit={handleCreatePerm} className='d-flex flex-column gap-3'>
                  <Row className='g-3'>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className='text-xs font-bold text-slate-500'>Mã Permission (Vd: MANAGE_PRODUCTS)</Form.Label>
                        <Form.Control
                          type='text'
                          value={newPerm.code}
                          onChange={(e) => setNewPerm((p) => ({ ...p, code: e.target.value }))}
                          placeholder='Mã code...'
                          className='shadow-none'
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className='text-xs font-bold text-slate-500'>Tên Permission (Vd: Quản lý sản phẩm)</Form.Label>
                        <Form.Control
                          type='text'
                          value={newPerm.name}
                          onChange={(e) => setNewPerm((p) => ({ ...p, name: e.target.value }))}
                          placeholder='Tên quyền...'
                          className='shadow-none'
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group>
                    <Form.Label className='text-xs font-bold text-slate-500'>Mô tả chi tiết</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={2}
                      value={newPerm.description}
                      onChange={(e) => setNewPerm((p) => ({ ...p, description: e.target.value }))}
                      placeholder='Mô tả chi tiết tác vụ...'
                      className='shadow-none'
                    />
                  </Form.Group>
                  <Button type='submit' size='sm' isLoading={isCreatingPerm}>Khai báo quyền hạn</Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </DashboardLayout>
  )
}

export default RolePermissionManagementPage

import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import TextField from '../../components/atoms/TextField'
import SelectField from '../../components/atoms/SelectField'
import { getErrorMessage } from '../../services/api'
import { getUsers, updateUser, createUser } from '../../services/user.service'
import { getId, pickArray } from '../../utils/format'
import { format } from 'date-fns'
import api from '../../services/api'

function StaffManagementPage() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [roles, setRoles] = useState([])
  
  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', gender: '', dob: '' })
  
  const load = async () => { 
    try { 
      const [res, rolesRes] = await Promise.all([
        getUsers(query ? { q: query } : {}),
        api.get('/role')
      ]);
      const allUsers = pickArray(res, []);
      const staffMembers = allUsers.filter(u => String(u.role_id?.code || '').toLowerCase() === 'staff');
      setUsers(staffMembers);
      
      if (rolesRes.data?.data) {
        setRoles(rolesRes.data.data)
      }
    } catch (error) { 
      setError(getErrorMessage(error, 'Không tải được danh sách nhân viên')) 
    } 
  }
  
  useEffect(() => { load() }, [])
  
  const handleStatus = async (e, user, status) => { 
    e.stopPropagation();
    try { 
      await updateUser(getId(user), { status }); 
      setMessage('Đã cập nhật trạng thái nhân viên.'); 
      load() 
    } catch (error) { 
      setError(getErrorMessage(error, 'Không cập nhật được nhân viên')) 
    } 
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ tên, email và mật khẩu.');
      return;
    }
    
    try {
      setIsCreating(true);
      const staffRole = roles.find(r => r.code === 'staff' || r.code === 'STAFF');
      if (!staffRole) throw new Error('Không tìm thấy Role Staff trên hệ thống.');
      
      const payload = { ...form, role_id: staffRole._id };
      await createUser(payload);
      
      setMessage('Tạo tài khoản nhân viên thành công!');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', password: '', gender: '', dob: '' });
      load();
    } catch (error) {
      setError(getErrorMessage(error, 'Không tạo được nhân viên'));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <DashboardLayout title='Quản lý Nhân viên' description='Quản lý thông tin và trạng thái tài khoản của nhân viên (Staff).'>
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>
      
      <Card className='card-surface mb-4'>
        <Card.Body className='p-4'>
          <div className='d-flex gap-2 flex-wrap'>
            <TextField placeholder='Tìm nhân viên theo tên/email/sđt' value={query} onChange={(e) => setQuery(e.target.value)} className='flex-grow-1' />
            <Button onClick={load}>Tìm kiếm</Button>
            <Button variant='success' onClick={() => setShowCreate(true)}>+ Thêm nhân viên</Button>
          </div>
        </Card.Body>
      </Card>
      
      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0' style={{ cursor: 'pointer' }}>
            <thead>
              <tr>
                <th className='p-3'>Thông tin</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th className='text-end p-3'>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={getId(user)} onClick={() => setSelectedUser(user)}>
                  <td className='p-3'>
                    <b>{user.name}</b><br />
                    <span className='text-sm text-slate-500'>{user.email}</span><br />
                    <span className='text-sm text-slate-500'>{user.phone || 'Chưa cập nhật SĐT'}</span>
                  </td>
                  <td className='align-middle'>
                    <span className='badge bg-blue-600 text-white rounded-pill px-3 py-2 shadow-sm'>Nhân viên</span>
                  </td>
                  <td className='align-middle'>
                    <span className={`badge rounded-pill px-3 py-2 shadow-sm text-white ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      {user.status === 'active' ? 'HOẠT ĐỘNG' : 'BỊ KHÓA'}
                    </span>
                  </td>
                  <td className='text-end p-3 align-middle'>
                    <Button size='sm' variant={user.status === 'active' ? 'danger' : 'success'} onClick={(e) => handleStatus(e, user, user.status === 'active' ? 'blocked' : 'active')}>
                      {user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className='text-center py-4 text-slate-500'>Không tìm thấy nhân viên nào</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Chi tiết Nhân viên Modal */}
      <Modal show={!!selectedUser} onHide={() => setSelectedUser(null)} centered>
        <Modal.Header closeButton className='border-0 pb-0'>
          <Modal.Title className='font-bold text-xl'>Chi tiết Nhân viên</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className='d-flex flex-column gap-3'>
              <div className='d-flex align-items-center gap-3 mb-3'>
                <div className='bg-slate-100 rounded-circle d-flex align-items-center justify-content-center' style={{ width: 60, height: 60 }}>
                  <span className='fs-3'>👔</span>
                </div>
                <div>
                  <h4 className='mb-0 font-bold'>{selectedUser.name}</h4>
                  <span className={`badge rounded-pill px-2 py-1 mt-1 text-white ${selectedUser.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {selectedUser.status === 'active' ? 'HOẠT ĐỘNG' : 'BỊ KHÓA'}
                  </span>
                </div>
              </div>
              
              <div className='p-3 bg-slate-50 rounded-3'>
                <p className='mb-2 text-sm'><span className='text-slate-500 d-inline-block' style={{ width: '80px' }}>Email:</span> <span className='font-bold text-slate-800'>{selectedUser.email}</span></p>
                <p className='mb-2 text-sm'><span className='text-slate-500 d-inline-block' style={{ width: '80px' }}>Số ĐT:</span> <span className='font-bold text-slate-800'>{selectedUser.phone || 'Chưa cập nhật'}</span></p>
                <p className='mb-2 text-sm'><span className='text-slate-500 d-inline-block' style={{ width: '80px' }}>Giới tính:</span> <span className='font-bold text-slate-800'>{selectedUser.gender === 'male' ? 'Nam' : selectedUser.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}</span></p>
                <p className='mb-2 text-sm'><span className='text-slate-500 d-inline-block' style={{ width: '80px' }}>Ngày sinh:</span> <span className='font-bold text-slate-800'>{selectedUser.dob ? format(new Date(selectedUser.dob), 'dd/MM/yyyy') : 'Chưa cập nhật'}</span></p>
                <p className='mb-0 text-sm'><span className='text-slate-500 d-inline-block align-top' style={{ width: '80px' }}>Địa chỉ:</span> <span className='font-bold text-slate-800 d-inline-block' style={{ width: 'calc(100% - 90px)' }}>{selectedUser.address?.length > 0 ? selectedUser.address[0]?.fullAddress : 'Chưa cập nhật'}</span></p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className='border-0 pt-0'>
          <Button variant='secondary' onClick={() => setSelectedUser(null)}>Đóng</Button>
        </Modal.Footer>
      </Modal>

      {/* Thêm Nhân viên Modal */}
      <Modal show={showCreate} onHide={() => !isCreating && setShowCreate(false)} centered>
        <Modal.Header closeButton className='border-0 pb-0'>
          <Modal.Title className='font-bold text-xl'>Thêm Nhân viên mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreate}>
          <Modal.Body>
            <div className='d-flex flex-column gap-3'>
              <TextField label='Họ và tên *' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <TextField label='Email *' type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              <TextField label='Mật khẩu tạm thời *' type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              <TextField label='Số điện thoại' type='tel' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <SelectField
                    label='Giới tính'
                    id='gender'
                    name='gender'
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    options={[
                      { value: '', label: 'Chưa cập nhật' },
                      { value: 'male', label: 'Nam' },
                      { value: 'female', label: 'Nữ' },
                      { value: 'other', label: 'Khác' },
                    ]}
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <Form.Group>
                    <Form.Label className='text-sm font-bold text-slate-700' htmlFor='dob'>Ngày sinh</Form.Label>
                    <Form.Control
                      type='date'
                      id='dob'
                      name='dob'
                      value={form.dob}
                      onChange={e => setForm({ ...form, dob: e.target.value })}
                      className='rounded-3 border-slate-200 px-3 py-2 text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                    />
                  </Form.Group>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className='border-0 pt-0'>
            <Button variant='secondary' onClick={() => setShowCreate(false)} disabled={isCreating}>Hủy</Button>
            <Button type='submit' isLoading={isCreating}>Tạo tài khoản</Button>
          </Modal.Footer>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

export default StaffManagementPage

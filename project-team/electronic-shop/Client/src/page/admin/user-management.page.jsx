import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { getUsers, updateUser } from '../../services/user.service'
import { getId, pickArray } from '../../utils/format'

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = async () => { try { const res = await getUsers(query ? { q: query } : {}); setUsers(pickArray(res, [])) } catch (error) { setError(getErrorMessage(error, 'Không tải được users')) } }
  useEffect(() => { load() }, [])
  const handleStatus = async (user, status) => { try { await updateUser(getId(user), { status }); setMessage('Đã cập nhật trạng thái user.'); load() } catch (error) { setError(getErrorMessage(error, 'Không cập nhật được user')) } }
  return <DashboardLayout title='Quản lý người dùng' description='Quản lý tài khoản và trạng thái tài khoản. Quyền người dùng được hệ thống thiết lập cố định.'><Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert><Card className='card-surface mb-4'><Card.Body className='p-4'><div className='d-flex gap-2'><TextField placeholder='Tìm theo tên, email hoặc số điện thoại' value={query} onChange={(e) => setQuery(e.target.value)} className='flex-grow-1' /><Button onClick={load}>Tìm kiếm</Button></div></Card.Body></Card><Card className='card-surface'><Card.Body className='p-0'><Table responsive hover className='mb-0'><thead><tr><th className='p-3'>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th className='text-end p-3'>Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={getId(user)}><td className='p-3'><b>{user.name}</b><br /><span className='text-sm text-slate-500'>{user.email}</span></td><td>{user.role_id?.name || user.role_id?.code || '--'}</td><td><StatusBadge value={user.status} label={user.status === 'active' ? 'Hoạt động' : user.status === 'blocked' ? 'Bị khóa' : user.status} /></td><td className='text-end p-3'><Button size='sm' variant={user.status === 'active' ? 'danger' : 'success'} onClick={() => handleStatus(user, user.status === 'active' ? 'blocked' : 'active')}>{user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}</Button></td></tr>)}</tbody></Table></Card.Body></Card></DashboardLayout>
}

export default UserManagementPage

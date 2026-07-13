import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'
import { getErrorMessage } from '../../services/api'
import { getTickets, updateTicket } from '../../services/support.service'
import { formatDate, getId, pickArray } from '../../utils/format'

function SupportManagementPage() {
  const [tickets, setTickets] = useState([])
  const [draft, setDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = async () => { try { const res = await getTickets(); const data = pickArray(res, []); setTickets(data); setDraft(Object.fromEntries(data.map((ticket) => [getId(ticket), ticket.status || 'open']))) } catch (error) { setError(getErrorMessage(error, 'Không tải được tickets')) } }
  useEffect(() => { load() }, [])
  const handleSave = async (id) => { try { await updateTicket(id, { status: draft[id] }); setMessage('Đã cập nhật ticket.'); load() } catch (error) { setError(getErrorMessage(error, 'Không cập nhật được ticket')) } }
  return <DashboardLayout title='Support Ticket Management' description='Staff xử lý và đóng yêu cầu hỗ trợ.'><Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert><Card className='card-surface'><Card.Body className='p-0'><Table responsive hover className='mb-0'><thead><tr><th className='p-3'>Ticket</th><th>Customer</th><th>Status</th><th>Update</th></tr></thead><tbody>{tickets.map((ticket) => { const id = getId(ticket); return <tr key={id}><td className='p-3'><b>{ticket.subject}</b><br /><span className='text-sm text-slate-500'>{ticket.description}</span><br /><span className='text-xs text-slate-400'>{formatDate(ticket.created_at)}</span></td><td>{ticket.user_id?.name || '--'}</td><td><StatusBadge value={ticket.status} /></td><td><div className='d-flex align-items-center gap-2'><SelectField value={draft[id]} options={[{ value: 'pending', label: 'Pending' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))} /><Button size='sm' onClick={() => handleSave(id)}>Save</Button></div></td></tr> })}</tbody></Table></Card.Body></Card></DashboardLayout>
}

export default SupportManagementPage

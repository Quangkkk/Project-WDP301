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
  return (
    <DashboardLayout title='Quản lý yêu cầu hỗ trợ' description='Nhân viên xử lý và đóng yêu cầu hỗ trợ.'>
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface border-0 shadow-sm' style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0' style={{ width: '45%' }}>Yêu cầu</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0'>Khách hàng</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center'>Trạng thái</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center' style={{ minWidth: '220px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const id = getId(ticket)
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className='p-4'>
                      <div className='d-flex flex-column'>
                        <span className='font-black text-slate-900 text-base mb-1'>
                          {ticket.subject}
                        </span>
                        <span className='text-sm text-slate-600 mb-2' style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ticket.description}
                        </span>
                        <span className='text-xs font-bold text-slate-400'>
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className='p-4'>
                      <span className='font-black text-slate-800'>
                        {ticket.user_id?.name || '--'}
                      </span>
                    </td>
                    <td className='p-4 text-center'>
                      <StatusBadge value={ticket.status} />
                    </td>
                    <td className='p-4'>
                      <div className='d-flex align-items-center justify-content-center gap-2'>
                        <div style={{ width: '130px' }}>
                          <SelectField
                            value={draft[id] || ticket.status || 'open'}
                            options={[
                              { value: 'pending', label: 'Chờ xử lý' },
                              { value: 'open', label: 'Đang mở' },
                              { value: 'closed', label: 'Đã đóng' },
                            ]}
                            onChange={(e) => setDraft((p) => ({ ...p, [id]: e.target.value }))}
                            className='form-select-sm border-slate-200 shadow-sm font-bold text-slate-700'
                          />
                        </div>
                        <Button size='sm' onClick={() => handleSave(id)} className='px-4'>
                          Lưu
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </DashboardLayout>
  )
}

export default SupportManagementPage

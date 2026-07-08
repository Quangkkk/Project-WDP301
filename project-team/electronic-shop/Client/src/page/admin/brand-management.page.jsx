import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import SelectField from '../../components/atoms/SelectField'
import TextField from '../../components/atoms/TextField'
import StatusBadge from '../../components/atoms/StatusBadge'
import { getErrorMessage } from '../../services/api'
import { getBrands, createBrand, updateBrand, deleteBrand } from '../../services/product.service'
import { getId, pickArray } from '../../utils/format'

const initialForm = { name: '', status: 'active', logo_img: '' }

function BrandManagementPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try { const res = await getBrands({}); setItems(pickArray(res, [])) }
    catch (error) { setError(getErrorMessage(error, 'Không tải được dữ liệu')) }
  }
  useEffect(() => { load() }, [])

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleEdit = (item) => { setEditingId(getId(item)); setForm({ name: item.name || '', status: item.status || 'active', logo_img: item.logo_img || '' }) }
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = true ? form : { name: form.name, status: form.status }
      if (editingId) await updateBrand(editingId, payload)
      else await createBrand(payload)
      setForm(initialForm); setEditingId(''); setMessage('Đã lưu dữ liệu.'); load()
    } catch (error) { setError(getErrorMessage(error, 'Không lưu được dữ liệu')) }
  }
  const handleDelete = async (id) => { if (!confirm('Delete this item?')) return; try { await deleteBrand(id); setMessage('Đã xóa dữ liệu.'); load() } catch (error) { setError(getErrorMessage(error, 'Không xóa được dữ liệu')) } }

  return (
    <DashboardLayout title='Brand Management' description='Tạo, cập nhật và xóa thương hiệu sản phẩm.'>
      <Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert>
      <Card className='card-surface mb-4'><Card.Body className='p-4'>
        <h3 className='mb-4 text-2xl font-black text-slate-950'>{editingId ? 'Update' : 'Create'} Brand</h3>
        <Form onSubmit={handleSubmit}><Row className='g-3'><Col md={true ? 4 : 6}><TextField label='Name' name='name' value={form.name} onChange={handleChange} required /></Col>{true && <Col md={4}><TextField label='Logo URL' name='logo_img' value={form.logo_img} onChange={handleChange} /></Col>}<Col md={true ? 4 : 6}><SelectField label='Status' name='status' value={form.status} onChange={handleChange} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Col></Row><div className='mt-4 d-flex gap-2'><Button type='submit'>{editingId ? 'Save' : 'Create'}</Button>{editingId && <Button type='button' variant='secondary' onClick={() => { setEditingId(''); setForm(initialForm) }}>Cancel</Button>}</div></Form>
      </Card.Body></Card>
      <Card className='card-surface'><Card.Body className='p-0'><Table responsive hover className='mb-0'><thead><tr><th className='p-3'>Name</th>{true && <th>Logo</th>}<th>Status</th><th className='text-end p-3'>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={getId(item)}><td className='p-3 font-bold'>{item.name}</td>{true && <td className='text-sm text-slate-500'>{item.logo_img || '--'}</td>}<td><StatusBadge value={item.status} /></td><td className='text-end p-3'><Button size='sm' variant='secondary' onClick={() => handleEdit(item)}>Edit</Button> <Button size='sm' variant='danger' onClick={() => handleDelete(getId(item))}>Delete</Button></td></tr>)}</tbody></Table></Card.Body></Card>
    </DashboardLayout>
  )
}

export default BrandManagementPage

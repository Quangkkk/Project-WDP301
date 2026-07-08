import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import TextAreaField from '../../components/atoms/TextAreaField'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../../services/coupon.service'
import { formatDate, getId, pickArray, toInputDate } from '../../utils/format'

const initialForm = { code: '', name: '', description: '', discount_type: 'fixed', discount_value: 0, min_order_amount: 0, max_discount: '', usage_limit: '', expired_at: '' }

function CouponManagementPage() {
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = async () => { try { const res = await getCoupons(); setCoupons(pickArray(res, [])) } catch (error) { setError(getErrorMessage(error, 'Không tải được coupons')) } }
  useEffect(() => { load() }, [])
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleEdit = (c) => { setEditingId(getId(c)); setForm({ code: c.code || '', name: c.name || '', description: c.description || '', discount_type: c.discount_type || 'fixed', discount_value: c.discount_value || 0, min_order_amount: c.min_order_amount || 0, max_discount: c.max_discount || '', usage_limit: c.usage_limit || '', expired_at: toInputDate(c.expired_at) }) }
  const payload = () => ({ ...form, discount_value: Number(form.discount_value || 0), min_order_amount: Number(form.min_order_amount || 0), max_discount: form.max_discount === '' ? null : Number(form.max_discount), usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit), expired_at: form.expired_at || null })
  const handleSubmit = async (e) => { e.preventDefault(); try { if (editingId) await updateCoupon(editingId, payload()); else await createCoupon(payload()); setForm(initialForm); setEditingId(''); setMessage('Đã lưu coupon.'); load() } catch (error) { setError(getErrorMessage(error, 'Không lưu được coupon')) } }
  const handleDelete = async (id) => { if (!confirm('Delete coupon?')) return; try { await deleteCoupon(id); setMessage('Đã xóa coupon.'); load() } catch (error) { setError(getErrorMessage(error, 'Không xóa được coupon')) } }
  return <DashboardLayout title='Coupon Management' description='Quản lý mã giảm giá cho checkout.'><Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert><Card className='card-surface mb-4'><Card.Body className='p-4'><Form onSubmit={handleSubmit}><Row className='g-3'><Col md={3}><TextField label='Code' name='code' value={form.code} onChange={handleChange} required /></Col><Col md={3}><TextField label='Name' name='name' value={form.name} onChange={handleChange} required /></Col><Col md={3}><SelectField label='Type' name='discount_type' value={form.discount_type} onChange={handleChange} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percent', label: 'Percent' }]} /></Col><Col md={3}><TextField label='Value' type='number' name='discount_value' value={form.discount_value} onChange={handleChange} /></Col><Col md={4}><TextField label='Min order amount' type='number' name='min_order_amount' value={form.min_order_amount} onChange={handleChange} /></Col><Col md={4}><TextField label='Max discount' type='number' name='max_discount' value={form.max_discount} onChange={handleChange} /></Col><Col md={4}><TextField label='Expired at' type='date' name='expired_at' value={form.expired_at} onChange={handleChange} /></Col><Col xs={12}><TextAreaField label='Description' name='description' value={form.description} onChange={handleChange} /></Col></Row><div className='mt-4 d-flex gap-2'><Button type='submit'>{editingId ? 'Save coupon' : 'Create coupon'}</Button>{editingId && <Button type='button' variant='secondary' onClick={() => { setEditingId(''); setForm(initialForm) }}>Cancel</Button>}</div></Form></Card.Body></Card><Card className='card-surface'><Card.Body className='p-0'><Table responsive hover className='mb-0'><thead><tr><th className='p-3'>Code</th><th>Name</th><th>Value</th><th>Expired</th><th className='text-end p-3'>Actions</th></tr></thead><tbody>{coupons.map((coupon) => <tr key={getId(coupon)}><td className='p-3 font-black'>{coupon.code}</td><td>{coupon.name}</td><td>{coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : <PriceText value={coupon.discount_value} />}</td><td>{formatDate(coupon.expired_at)}</td><td className='text-end p-3'><Button size='sm' variant='secondary' onClick={() => handleEdit(coupon)}>Edit</Button> <Button size='sm' variant='danger' onClick={() => handleDelete(getId(coupon))}>Delete</Button></td></tr>)}</tbody></Table></Card.Body></Card></DashboardLayout>
}

export default CouponManagementPage

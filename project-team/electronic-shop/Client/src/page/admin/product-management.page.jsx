import { useEffect, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'
import TextAreaField from '../../components/atoms/TextAreaField'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { createProduct, deleteProduct, getBrands, getCategories, getProducts, updateProduct } from '../../services/product.service'
import { getId, pickArray } from '../../utils/format'
import { getProductPrice, getStock } from '../../utils/product'

const initialForm = { name: '', sku: '', description: '', brand_id: '', category_id: '', status: 'active', is_featured: false }

function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    const [p, b, c] = await Promise.allSettled([getProducts(), getBrands({}), getCategories({})])
    setProducts(p.status === 'fulfilled' ? pickArray(p.value, []) : [])
    setBrands(b.status === 'fulfilled' ? pickArray(b.value, []) : [])
    setCategories(c.status === 'fulfilled' ? pickArray(c.value, []) : [])
  }

  useEffect(() => { load() }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleEdit = (product) => {
    setEditingId(getId(product))
    setForm({ name: product.name || '', sku: product.sku || '', description: product.description || '', brand_id: getId(product.brand_id), category_id: getId(product.category_id), status: product.status || 'active', is_featured: Boolean(product.is_featured) })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSaving(true)
      const payload = { ...form, is_featured: Boolean(form.is_featured) }
      if (editingId) await updateProduct(editingId, payload)
      else await createProduct(payload)
      setForm(initialForm)
      setEditingId('')
      setMessage(editingId ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.')
      load()
    } catch (error) { setError(getErrorMessage(error, 'Không lưu được sản phẩm')) }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
    try { await deleteProduct(id); setMessage('Đã xóa sản phẩm.'); load() }
    catch (error) { setError(getErrorMessage(error, 'Không xóa được sản phẩm')) }
  }

  return (
    <DashboardLayout title='Quản lý sản phẩm' description='Quản lý sản phẩm, thương hiệu, danh mục và trạng thái hiển thị.'>
      <Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert>
      <Card className='card-surface mb-4'><Card.Body className='p-4'>
        <h3 className='mb-4 text-2xl font-black text-slate-950'>{editingId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}</h3>
        <Form onSubmit={handleSubmit}>
          <Row className='g-3'>
            <Col md={6}><TextField label='Tên sản phẩm' name='name' value={form.name} onChange={handleChange} required /></Col>
            <Col md={6}><TextField label='SKU' name='sku' value={form.sku} onChange={handleChange} required /></Col>
            <Col md={6}><SelectField label='Thương hiệu' name='brand_id' value={form.brand_id} onChange={handleChange} options={[{ value: '', label: 'Chọn thương hiệu' }, ...brands.map((x) => ({ value: getId(x), label: x.name }))]} /></Col>
            <Col md={6}><SelectField label='Danh mục' name='category_id' value={form.category_id} onChange={handleChange} options={[{ value: '', label: 'Chọn danh mục' }, ...categories.map((x) => ({ value: getId(x), label: x.name }))]} /></Col>
            <Col md={6}><SelectField label='Trạng thái' name='status' value={form.status} onChange={handleChange} options={[{ value: 'active', label: 'Đang bán' }, { value: 'inactive', label: 'Ngừng bán' }, { value: 'out_of_stock', label: 'Hết hàng' }]} /></Col>
            <Col md={6} className='d-flex align-items-end'><Form.Check type='checkbox' name='is_featured' checked={form.is_featured} onChange={handleChange} label='Sản phẩm nổi bật' className='font-bold text-slate-700' /></Col>
            <Col xs={12}><TextAreaField label='Mô tả' name='description' value={form.description} onChange={handleChange} /></Col>
          </Row>
          <div className='mt-4 d-flex gap-2'><Button type='submit' isLoading={isSaving}>{editingId ? 'Lưu sản phẩm' : 'Tạo sản phẩm'}</Button>{editingId && <Button type='button' variant='secondary' onClick={() => { setEditingId(''); setForm(initialForm) }}>Hủy</Button>}</div>
        </Form>
      </Card.Body></Card>
      <Card className='card-surface'><Card.Body className='p-0'><Table responsive hover className='mb-0'><thead><tr><th className='p-3'>Sản phẩm</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th className='text-end p-3'>Thao tác</th></tr></thead><tbody>{products.map((product) => <tr key={getId(product)}><td className='p-3'><b>{product.name}</b><br /><span className='text-sm text-slate-500'>{product.sku}</span></td><td><PriceText value={getProductPrice(product)} /></td><td>{getStock(product)}</td><td><StatusBadge value={product.status} /></td><td className='text-end p-3'><Button size='sm' variant='secondary' onClick={() => handleEdit(product)}>Sửa</Button> <Button size='sm' variant='danger' onClick={() => handleDelete(getId(product))}>Xóa</Button></td></tr>)}</tbody></Table></Card.Body></Card>
    </DashboardLayout>
  )
}

export default ProductManagementPage

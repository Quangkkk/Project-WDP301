import { useEffect, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'
import TextAreaField from '../../components/atoms/TextAreaField'
import TextField from '../../components/atoms/TextField'

import { getErrorMessage } from '../../services/api'
import {
  createProduct,
  deleteProduct,
  getBrands,
  getCategories,
  getProducts,
  updateProduct,
} from '../../services/product.service'
import { getId, pickArray } from '../../utils/format'
import { getProductPrice, getProductImage, getStock } from '../../utils/product'

const initialForm = {
  name: '',
  sku: '',
  description: '',
  brand_id: '',
  category_id: '',
  status: 'active',
  is_featured: false,
}

function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])

  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')

  const load = async () => {
    setIsLoading(true)
    try {
      const [p, b, c] = await Promise.allSettled([
        getProducts(),
        getBrands({}),
        getCategories({}),
      ])
      setProducts(p.status === 'fulfilled' ? pickArray(p.value, []) : [])
      setBrands(b.status === 'fulfilled' ? pickArray(b.value, []) : [])
      setCategories(c.status === 'fulfilled' ? pickArray(c.value, []) : [])
    } catch (err) {
      setError('Lỗi khi tải dữ liệu sản phẩm.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(getId(product))
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        brand_id: getId(product.brand_id),
        category_id: getId(product.category_id),
        status: product.status || 'active',
        is_featured: Boolean(product.is_featured),
      })
    } else {
      setEditingId('')
      setForm(initialForm)
    }
    setError('')
    setMessage('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId('')
    setForm(initialForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setError('')
      const payload = { ...form, is_featured: Boolean(form.is_featured) }
      if (editingId) {
        await updateProduct(editingId, payload)
      } else {
        await createProduct(payload)
      }
      setMessage(editingId ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.')
      handleCloseModal()
      load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không lưu được sản phẩm'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
    try {
      await deleteProduct(id)
      setMessage('Đã xóa sản phẩm.')
      load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không xóa được sản phẩm'))
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = filterCategory ? getId(p.category_id) === filterCategory : true
    const matchBrand = filterBrand ? getId(p.brand_id) === filterBrand : true
    return matchSearch && matchCat && matchBrand
  })

  return (
    <DashboardLayout
      title='Quản lý sản phẩm'
      description='Quản lý sản phẩm, thương hiệu, danh mục và trạng thái hiển thị.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface mb-4'>
        <Card.Body className='p-3'>
          <Row className='g-3'>
            <Col md={4}>
              <Form.Control
                type='text'
                placeholder='Tìm sản phẩm theo Tên / SKU...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='!rounded-pill shadow-none'
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className='!rounded-pill shadow-none'
              >
                <option value=''>Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={getId(c)} value={getId(c)}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className='!rounded-pill shadow-none'
              >
                <option value=''>Tất cả thương hiệu</option>
                {brands.map((b) => (
                  <option key={getId(b)} value={getId(b)}>
                    {b.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2} className='text-end'>
              <Button onClick={() => handleOpenModal()} className='w-100 !rounded-pill'>
                + Thêm mới
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='p-3'>Sản phẩm</th>
                <th>Thương hiệu / Danh mục</th>
                <th>Giá & Kho</th>
                <th>Trạng thái</th>
                <th className='text-end p-3'>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan='5' className='text-center py-5 text-slate-500'>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan='5' className='text-center py-5 text-slate-500'>
                    Không tìm thấy sản phẩm nào.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const pImage = getProductImage(product)
                  return (
                    <tr key={getId(product)}>
                      <td className='p-3 d-flex align-items-center gap-3'>
                        <div
                          className='bg-white border !rounded-3 overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center'
                          style={{ width: 50, height: 50 }}
                        >
                          {pImage ? (
                            <img src={pImage} alt={product.name} className='w-100 h-100 object-fit-contain p-1' />
                          ) : (
                            <i className='bi bi-box fs-4 text-slate-300'></i>
                          )}
                        </div>
                        <div>
                          <b className='text-slate-900'>{product.name}</b>
                          <br />
                          <span className='text-xs text-slate-500 d-flex align-items-center gap-1 mt-1'>
                            <i className='bi bi-upc-scan' /> {product.sku}
                            {product.is_featured && (
                              <span className='ms-2 px-1 text-[10px] bg-orange-100 text-orange-600 !rounded-pill font-bold'>
                                Nổi bật
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className='text-sm text-slate-700'>
                          <b>Thương hiệu:</b> {product.brand_id?.name || '-'}
                        </div>
                        <div className='text-sm text-slate-500 mt-1'>
                          <b>Danh mục:</b> {product.category_id?.name || '-'}
                        </div>
                      </td>
                      <td>
                        <PriceText value={getProductPrice(product)} className='font-bold text-orange-600' />
                        <div className='text-xs text-slate-500 mt-1'>
                          Tồn kho: <b>{getStock(product)}</b>
                        </div>
                      </td>
                      <td>
                        <StatusBadge value={product.status} />
                      </td>
                      <td className='text-end p-3'>
                        <div className='d-flex gap-2 justify-content-end'>
                          <button
                            type='button'
                            className='btn btn-light btn-sm text-blue-600 !rounded-circle d-flex align-items-center justify-content-center'
                            style={{ width: 32, height: 32 }}
                            onClick={() => handleOpenModal(product)}
                            title='Sửa'
                          >
                            <i className='bi bi-pencil-fill'></i>
                          </button>
                          <button
                            type='button'
                            className='btn btn-light btn-sm text-red-500 !rounded-circle d-flex align-items-center justify-content-center'
                            style={{ width: 32, height: 32 }}
                            onClick={() => handleDelete(getId(product))}
                            title='Xóa'
                          >
                            <i className='bi bi-trash-fill'></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal form */}
      <Modal show={showModal} onHide={handleCloseModal} size='lg' centered>
        <Modal.Header closeButton className='border-bottom-0 pb-0'>
          <Modal.Title className='h5 font-black text-slate-900'>
            {editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className='pt-3'>
            <Row className='g-3'>
              <Col md={6}>
                <TextField label='Tên sản phẩm' name='name' value={form.name} onChange={handleChange} required />
              </Col>
              <Col md={6}>
                <TextField label='SKU' name='sku' value={form.sku} onChange={handleChange} required />
              </Col>
              <Col md={6}>
                <SelectField
                  label='Thương hiệu'
                  name='brand_id'
                  value={form.brand_id}
                  onChange={handleChange}
                  options={[{ value: '', label: 'Chọn thương hiệu' }, ...brands.map((x) => ({ value: getId(x), label: x.name }))]}
                />
              </Col>
              <Col md={6}>
                <SelectField
                  label='Danh mục'
                  name='category_id'
                  value={form.category_id}
                  onChange={handleChange}
                  options={[{ value: '', label: 'Chọn danh mục' }, ...categories.map((x) => ({ value: getId(x), label: x.name }))]}
                />
              </Col>
              <Col md={6}>
                <SelectField
                  label='Trạng thái hiển thị'
                  name='status'
                  value={form.status}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Đang bán' },
                    { value: 'inactive', label: 'Ngừng bán' },
                    { value: 'out_of_stock', label: 'Hết hàng' },
                  ]}
                />
              </Col>
              <Col md={6} className='d-flex align-items-center pt-2'>
                <Form.Check
                  type='checkbox'
                  name='is_featured'
                  checked={form.is_featured}
                  onChange={handleChange}
                  label='Sản phẩm nổi bật (Hiển thị trang chủ)'
                  className='font-bold text-slate-700'
                  id='is_featured_check'
                />
              </Col>
              <Col xs={12}>
                <TextAreaField label='Mô tả sản phẩm' name='description' value={form.description} onChange={handleChange} rows={4} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className='border-top-0'>
            <Button type='button' variant='light' onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button type='submit' isLoading={isSaving}>
              {editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </DashboardLayout>
  )
}

export default ProductManagementPage

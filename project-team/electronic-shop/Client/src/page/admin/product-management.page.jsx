import { useEffect, useMemo, useState } from 'react'
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
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getBrands,
  getCategories,
  getProductById,
  getProducts,
  updateProduct,
  updateVariant,
  uploadProductImage,
} from '../../services/product.service'
import { getId, pickArray } from '../../utils/format'
import { getProductPrice, getStock } from '../../utils/product'

const createEmptyVariant = () => ({
  _id: '',
  sku: '',
  variant_value: '',
  price: '',
  sale_price: '',
  stock_quantity: '',
  weight: '',
  image: '',
  attributes_text: '{}',
  is_active: true,
})

const initialForm = {
  name: '',
  sku: '',
  description: '',
  brand_id: '',
  category_id: '',
  status: 'active',
  is_featured: false,
  variants: [createEmptyVariant()],
}

const normalizeVariant = (variant = {}) => ({
  _id: getId(variant),
  sku: variant.sku || '',
  variant_value: variant.variant_value || '',
  price: variant.price ?? '',
  sale_price: variant.sale_price ?? '',
  stock_quantity: variant.stock_quantity ?? '',
  weight: variant.weight ?? '',
  image: variant.image || '',
  attributes_text: JSON.stringify(variant.attributes_json || {}, null, 2),
  is_active: variant.is_active !== false,
})

const parseAttributes = (value) => {
  const text = String(value || '').trim()
  if (!text) return {}

  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Thuộc tính phải là một JSON object.')
    }
    return parsed
  } catch {
    throw new Error('Thuộc tính JSON không hợp lệ. Ví dụ: {"Màu":"Đen"}')
  }
}

const buildVariantPayload = (variant) => ({
  sku: String(variant.sku || '').trim(),
  variant_value: String(variant.variant_value || '').trim(),
  price: Number(variant.price || 0),
  sale_price: Number(variant.sale_price || 0),
  stock_quantity: Number(variant.stock_quantity || 0),
  weight:
    variant.weight === '' || variant.weight === null
      ? null
      : Number(variant.weight),
  image: String(variant.image || '').trim() || null,
  attributes_json: parseAttributes(variant.attributes_text),
  is_active: Boolean(variant.is_active),
})

function ProductManagementPage() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState('')
  const [deletedVariantIds, setDeletedVariantIds] = useState([])
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState(-1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)

  const isEditing = Boolean(editingId)

  const load = async () => {
    const [productResult, brandResult, categoryResult] = await Promise.allSettled([
      getProducts({ limit: 100 }),
      getBrands({}),
      getCategories({}),
    ])

    setProducts(
      productResult.status === 'fulfilled' ? pickArray(productResult.value, []) : [],
    )
    setBrands(
      brandResult.status === 'fulfilled' ? pickArray(brandResult.value, []) : [],
    )
    setCategories(
      categoryResult.status === 'fulfilled' ? pickArray(categoryResult.value, []) : [],
    )
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId('')
    setDeletedVariantIds([])
    setUploadingVariantIndex(-1)
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))

    setError('')
    setMessage('')
  }

  const handleVariantChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    }))

    setError('')
    setMessage('')
  }

  const handleAddVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, createEmptyVariant()],
    }))
  }

  const handleRemoveVariant = (index) => {
    setForm((current) => {
      const variant = current.variants[index]

      if (variant?._id) {
        setDeletedVariantIds((ids) => [...new Set([...ids, variant._id])])
      }

      const variants = current.variants.filter((_, variantIndex) => variantIndex !== index)

      return {
        ...current,
        variants: variants.length ? variants : [createEmptyVariant()],
      }
    })
  }

  const handleImageFile = async (index, file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn đúng tệp ảnh.')
      return
    }

    try {
      setUploadingVariantIndex(index)
      setError('')

      const response = await uploadProductImage(file)
      const imageUrl = response?.data?.url || response?.url || ''

      if (!imageUrl) {
        throw new Error('Backend không trả về đường dẫn ảnh.')
      }

      handleVariantChange(index, 'image', imageUrl)
      setMessage('Tải ảnh sản phẩm thành công.')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Không tải được ảnh sản phẩm.'))
    } finally {
      setUploadingVariantIndex(-1)
    }
  }

  const handleEdit = async (product) => {
    try {
      setIsLoadingEdit(true)
      setError('')
      setMessage('')

      const productId = getId(product)
      const response = await getProductById(productId)
      const data = response?.data || response || {}
      const detail = data.product || product
      const variants = data.variants || detail.variants || []

      setEditingId(productId)
      setDeletedVariantIds([])
      setForm({
        name: detail.name || '',
        sku: detail.sku || '',
        description: detail.description || '',
        brand_id: getId(detail.brand_id),
        category_id: getId(detail.category_id),
        status: detail.status || 'active',
        is_featured: Boolean(detail.is_featured),
        variants: variants.length
          ? variants.map(normalizeVariant)
          : [createEmptyVariant()],
      })

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (editError) {
      setError(getErrorMessage(editError, 'Không tải được chi tiết sản phẩm.'))
    } finally {
      setIsLoadingEdit(false)
    }
  }

  const validateForm = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      return 'Vui lòng nhập tên sản phẩm và SKU.'
    }

    if (!form.brand_id || !form.category_id) {
      return 'Vui lòng chọn thương hiệu và danh mục.'
    }

    if (!form.variants.length) {
      return 'Sản phẩm phải có ít nhất một phiên bản.'
    }

    for (const [index, variant] of form.variants.entries()) {
      if (!variant.sku.trim() || !variant.variant_value.trim()) {
        return `Vui lòng nhập SKU và tên phiên bản ở dòng ${index + 1}.`
      }

      if (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0) {
        return `Giá bán ở phiên bản ${index + 1} không hợp lệ.`
      }

      if (
        !Number.isInteger(Number(variant.stock_quantity || 0)) ||
        Number(variant.stock_quantity || 0) < 0
      ) {
        return `Tồn kho ở phiên bản ${index + 1} không hợp lệ.`
      }

      parseAttributes(variant.attributes_text)
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const validationMessage = validateForm()
      if (validationMessage) {
        setError(validationMessage)
        return
      }

      const productPayload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || null,
        brand_id: form.brand_id,
        category_id: form.category_id,
        status: form.status,
        is_featured: Boolean(form.is_featured),
      }

      const variantRows = form.variants.map((variant) => ({
        id: variant._id,
        payload: buildVariantPayload(variant),
      }))

      if (!isEditing) {
        await createProduct({
          ...productPayload,
          variants: variantRows.map((variant) => variant.payload),
        })
        setMessage('Đã tạo sản phẩm và các phiên bản.')
      } else {
        await updateProduct(editingId, productPayload)

        await Promise.all([
          ...variantRows.map((variant) =>
            variant.id
              ? updateVariant(variant.id, variant.payload)
              : createVariant(editingId, variant.payload),
          ),
          ...deletedVariantIds.map((variantId) => deleteVariant(variantId)),
        ])

        setMessage('Đã cập nhật đầy đủ sản phẩm và các phiên bản.')
      }

      resetForm()
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được sản phẩm.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm và toàn bộ phiên bản?')) {
      return
    }

    try {
      await deleteProduct(id)
      setMessage('Đã xóa sản phẩm.')
      await load()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được sản phẩm.'))
    }
  }

  const totalVariants = useMemo(
    () => form.variants.length,
    [form.variants.length],
  )

  return (
    <DashboardLayout
      title='Quản lý sản phẩm'
      description='Thêm, sửa sản phẩm, phiên bản, giá, tồn kho và ảnh tải từ máy.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface mb-4'>
        <Card.Body className='p-4'>
          <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
            <div>
              <h3 className='mb-1 text-2xl font-black text-slate-950'>
                {isEditing ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
              </h3>
              <p className='mb-0 text-sm text-slate-500'>
                Đang có {totalVariants} phiên bản trong biểu mẫu.
              </p>
            </div>

            {isEditing && (
              <Button type='button' variant='secondary' onClick={resetForm}>
                Tạo sản phẩm khác
              </Button>
            )}
          </div>

          <Form onSubmit={handleSubmit}>
            <Row className='g-3'>
              <Col md={6}>
                <TextField
                  label='Tên sản phẩm'
                  name='name'
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </Col>

              <Col md={6}>
                <TextField
                  label='SKU sản phẩm'
                  name='sku'
                  value={form.sku}
                  onChange={handleChange}
                  required
                />
              </Col>

              <Col md={6}>
                <SelectField
                  label='Thương hiệu'
                  name='brand_id'
                  value={form.brand_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Chọn thương hiệu' },
                    ...brands.map((item) => ({
                      value: getId(item),
                      label: item.name,
                    })),
                  ]}
                />
              </Col>

              <Col md={6}>
                <SelectField
                  label='Danh mục'
                  name='category_id'
                  value={form.category_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Chọn danh mục' },
                    ...categories.map((item) => ({
                      value: getId(item),
                      label: item.name,
                    })),
                  ]}
                />
              </Col>

              <Col md={6}>
                <SelectField
                  label='Trạng thái sản phẩm'
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

              <Col md={6} className='d-flex align-items-end pb-2'>
                <Form.Check
                  type='checkbox'
                  name='is_featured'
                  checked={form.is_featured}
                  onChange={handleChange}
                  label='Sản phẩm nổi bật'
                  className='font-bold text-slate-700'
                />
              </Col>

              <Col xs={12}>
                <TextAreaField
                  label='Mô tả chi tiết'
                  name='description'
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                />
              </Col>
            </Row>

            <div className='my-4 border-top' />

            <div className='mb-3 d-flex align-items-center justify-content-between gap-3'>
              <div>
                <h4 className='mb-1 text-xl font-black text-slate-950'>
                  Phiên bản, giá, tồn kho và ảnh
                </h4>
                <p className='mb-0 text-sm text-slate-500'>
                  Ảnh được tải từ máy và lưu tại backend local.
                </p>
              </div>

              <Button type='button' variant='secondary' onClick={handleAddVariant}>
                + Thêm phiên bản
              </Button>
            </div>

            <div className='d-flex flex-column gap-4'>
              {form.variants.map((variant, index) => (
                <Card key={variant._id || `variant-${index}`} className='border'>
                  <Card.Body className='p-3 p-md-4'>
                    <div className='mb-3 d-flex align-items-center justify-content-between'>
                      <strong>Phiên bản {index + 1}</strong>
                      <Button
                        type='button'
                        size='sm'
                        variant='danger'
                        onClick={() => handleRemoveVariant(index)}
                      >
                        Xóa phiên bản
                      </Button>
                    </div>

                    <Row className='g-3'>
                      <Col md={6}>
                        <TextField
                          label='SKU phiên bản'
                          value={variant.sku}
                          onChange={(event) =>
                            handleVariantChange(index, 'sku', event.target.value)
                          }
                          required
                        />
                      </Col>

                      <Col md={6}>
                        <TextField
                          label='Tên phiên bản'
                          placeholder='Ví dụ: Đen / 16GB / 512GB'
                          value={variant.variant_value}
                          onChange={(event) =>
                            handleVariantChange(index, 'variant_value', event.target.value)
                          }
                          required
                        />
                      </Col>

                      <Col md={4}>
                        <TextField
                          label='Giá gốc'
                          type='number'
                          min='0'
                          value={variant.price}
                          onChange={(event) =>
                            handleVariantChange(index, 'price', event.target.value)
                          }
                          required
                        />
                      </Col>

                      <Col md={4}>
                        <TextField
                          label='Giá khuyến mãi'
                          type='number'
                          min='0'
                          value={variant.sale_price}
                          onChange={(event) =>
                            handleVariantChange(index, 'sale_price', event.target.value)
                          }
                        />
                      </Col>

                      <Col md={4}>
                        <TextField
                          label='Tồn kho'
                          type='number'
                          min='0'
                          value={variant.stock_quantity}
                          onChange={(event) =>
                            handleVariantChange(index, 'stock_quantity', event.target.value)
                          }
                          required
                        />
                      </Col>

                      <Col md={4}>
                        <TextField
                          label='Khối lượng (gram)'
                          type='number'
                          min='0'
                          value={variant.weight}
                          onChange={(event) =>
                            handleVariantChange(index, 'weight', event.target.value)
                          }
                        />
                      </Col>

                      <Col md={8}>
                        <Form.Group>
                          <Form.Label className='font-bold text-slate-700'>
                            Chọn ảnh từ máy
                          </Form.Label>
                          <Form.Control
                            type='file'
                            accept='image/jpeg,image/png,image/webp,image/gif'
                            disabled={uploadingVariantIndex === index}
                            onChange={(event) =>
                              handleImageFile(index, event.target.files?.[0])
                            }
                          />
                          <Form.Text className='text-slate-500'>
                            Tối đa 5MB. Hỗ trợ JPG, PNG, WEBP, GIF.
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col xs={12}>
                        <TextField
                          label='Đường dẫn ảnh'
                          value={variant.image}
                          onChange={(event) =>
                            handleVariantChange(index, 'image', event.target.value)
                          }
                          placeholder='Được tự điền sau khi tải ảnh'
                        />
                      </Col>

                      {variant.image && (
                        <Col xs={12}>
                          <img
                            src={variant.image}
                            alt={variant.variant_value || 'Ảnh phiên bản'}
                            className='rounded border object-cover'
                            style={{ width: 140, height: 140 }}
                          />
                        </Col>
                      )}

                      <Col xs={12}>
                        <TextAreaField
                          label='Thuộc tính JSON'
                          rows={3}
                          value={variant.attributes_text}
                          onChange={(event) =>
                            handleVariantChange(index, 'attributes_text', event.target.value)
                          }
                          placeholder='{"Màu":"Đen","RAM":"16GB"}'
                        />
                      </Col>

                      <Col xs={12}>
                        <Form.Check
                          type='switch'
                          checked={variant.is_active}
                          onChange={(event) =>
                            handleVariantChange(index, 'is_active', event.target.checked)
                          }
                          label='Phiên bản đang bán'
                        />
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>

            <div className='mt-4 d-flex flex-wrap gap-2'>
              <Button type='submit' isLoading={isSaving || isLoadingEdit}>
                {isEditing ? 'Lưu toàn bộ thay đổi' : 'Tạo sản phẩm'}
              </Button>

              {isEditing && (
                <Button type='button' variant='secondary' onClick={resetForm}>
                  Hủy chỉnh sửa
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0'>
            <thead>
              <tr>
                <th className='p-3'>Sản phẩm</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th className='text-end p-3'>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={getId(product)}>
                  <td className='p-3'>
                    <div className='d-flex align-items-center gap-3'>
                      {product.variants?.[0]?.image && (
                        <img
                          src={product.variants[0].image}
                          alt={product.name}
                          className='rounded border object-cover'
                          style={{ width: 54, height: 54 }}
                        />
                      )}
                      <div>
                        <b>{product.name}</b>
                        <br />
                        <span className='text-sm text-slate-500'>{product.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <PriceText value={getProductPrice(product)} />
                  </td>
                  <td>{getStock(product)}</td>
                  <td>
                    <StatusBadge value={product.status} />
                  </td>
                  <td className='text-end p-3'>
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => handleEdit(product)}
                    >
                      Sửa đầy đủ
                    </Button>{' '}
                    <Button
                      size='sm'
                      variant='danger'
                      onClick={() => handleDelete(getId(product))}
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </DashboardLayout>
  )
}

export default ProductManagementPage
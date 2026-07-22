import { useEffect, useMemo, useState } from 'react'
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
  getProductById,
  getProducts,
  updateProduct,
  uploadProductImage,
} from '../../services/product.service'
import { getCurrentUser, getUserRole } from '../../utils/authStorage'
import { getId, pickArray } from '../../utils/format'
import {
  getProductImage,
  getProductPrice,
  getStock,
} from '../../utils/product'

const createEmptyVariant = () => ({
  _id: '',
  sku: '',
  variant_value: '',
  price: '',
  sale_price: '',
  stock_quantity: '0',
  weight: '',
  image: '',
  preview_url: '',
  image_broken: false,
  attributes_text: '{}',
  is_active: true,
})

const createInitialForm = () => ({
  name: '',
  sku: '',
  description: '',
  brand_id: '',
  category_id: '',
  status: 'active',
  is_featured: false,
  variants: [createEmptyVariant()],
})

function toInputNumber(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function parseLocalizedNumber(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')

  return normalized === '' ? Number.NaN : Number(normalized)
}

function stringifyAttributes(value) {
  if (!value || typeof value !== 'object') return '{}'

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

function normalizeDetailResponse(response) {
  const data = response?.data || response || {}

  if (data?.product) {
    return {
      product: data.product,
      variants: Array.isArray(data.variants) ? data.variants : [],
    }
  }

  if (data?.data?.product) {
    return {
      product: data.data.product,
      variants: Array.isArray(data.data.variants) ? data.data.variants : [],
    }
  }

  return {
    product: data,
    variants: Array.isArray(data?.variants) ? data.variants : [],
  }
}

function normalizeVariantForForm(variant) {
  return {
    _id: getId(variant),
    sku: variant?.sku || '',
    variant_value:
      variant?.variant_value ||
      variant?.variant_name ||
      '',
    price: toInputNumber(variant?.price),
    sale_price: toInputNumber(variant?.sale_price, '0'),
    stock_quantity: toInputNumber(variant?.stock_quantity, '0'),
    weight: toInputNumber(variant?.weight),
    image: variant?.image || '',
    preview_url: '',
    image_broken: false,
    attributes_text: stringifyAttributes(variant?.attributes_json),
    is_active: variant?.is_active !== false,
  }
}

function parseAttributes(text, variantIndex) {
  const value = String(text || '').trim()
  if (!value) return {}

  let parsed

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(
      `Thuộc tính JSON của phiên bản ${variantIndex + 1} không hợp lệ.`,
    )
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      `Thuộc tính phiên bản ${variantIndex + 1} phải là một object JSON.`,
    )
  }

  return parsed
}

function validateAndBuildPayload(form) {
  const name = form.name.trim()
  const sku = form.sku.trim().toUpperCase()

  if (!name || !sku || !form.brand_id || !form.category_id) {
    throw new Error(
      'Vui lòng nhập đầy đủ tên, SKU, thương hiệu và danh mục.',
    )
  }

  if (!Array.isArray(form.variants) || form.variants.length === 0) {
    throw new Error('Sản phẩm phải có ít nhất một phiên bản.')
  }

  const variantSkus = new Set()

  const variants = form.variants.map((variant, index) => {
    const variantSku = String(variant.sku || '')
      .trim()
      .toUpperCase()
    const variantValue = String(variant.variant_value || '').trim()
    const price = parseLocalizedNumber(variant.price)
    const salePrice = parseLocalizedNumber(variant.sale_price || 0)
    const stockQuantity = Number(variant.stock_quantity || 0)
    const weight =
      String(variant.weight ?? '').trim() === ''
        ? null
        : parseLocalizedNumber(variant.weight)

    if (!variantSku || !variantValue) {
      throw new Error(
        `Phiên bản ${index + 1} phải có SKU và tên phiên bản.`,
      )
    }

    if (variantSkus.has(variantSku)) {
      throw new Error('SKU phiên bản không được trùng nhau.')
    }

    variantSkus.add(variantSku)

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Giá gốc của phiên bản ${index + 1} không hợp lệ.`)
    }

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error(
        `Giá khuyến mãi của phiên bản ${index + 1} không hợp lệ.`,
      )
    }

    if (salePrice > 0 && salePrice > price) {
      throw new Error(
        `Giá khuyến mãi của phiên bản ${index + 1} không được lớn hơn giá gốc.`,
      )
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error(
        `Tồn kho của phiên bản ${index + 1} phải là số nguyên không âm.`,
      )
    }

    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
      throw new Error(
        `Khối lượng của phiên bản ${index + 1} không hợp lệ.`,
      )
    }

    return {
      ...(variant._id ? { _id: variant._id } : {}),
      sku: variantSku,
      variant_value: variantValue,
      price,
      sale_price: salePrice,
      stock_quantity: stockQuantity,
      weight,
      image: String(variant.image || '').trim() || null,
      attributes_json: parseAttributes(variant.attributes_text, index),
      is_active: Boolean(variant.is_active),
    }
  })

  return {
    name,
    sku,
    description: form.description.trim() || null,
    brand_id: form.brand_id,
    category_id: form.category_id,
    status: form.status,
    is_featured: Boolean(form.is_featured),
    variants,
  }
}

function ProductManagementPage() {
  const role = getUserRole(getCurrentUser())
  const canCreateOrDelete = ['ADMIN', 'MANAGER'].includes(role)

  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])

  const [form, setForm] = useState(createInitialForm)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEditor, setIsLoadingEditor] = useState(false)
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState(-1)
  const [showModal, setShowModal] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [productResult, brandResult, categoryResult] =
        await Promise.allSettled([
          getProducts({ limit: 500 }),
          getBrands({}),
          getCategories({}),
        ])

      setProducts(
        productResult.status === 'fulfilled'
          ? pickArray(productResult.value, [])
          : [],
      )
      setBrands(
        brandResult.status === 'fulfilled'
          ? pickArray(brandResult.value, [])
          : [],
      )
      setCategories(
        categoryResult.status === 'fulfilled'
          ? pickArray(categoryResult.value, [])
          : [],
      )

      if (
        productResult.status === 'rejected' ||
        brandResult.status === 'rejected' ||
        categoryResult.status === 'rejected'
      ) {
        setError('Một phần dữ liệu quản lý sản phẩm chưa tải được.')
      }
    } catch {
      setError('Lỗi khi tải dữ liệu sản phẩm.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        String(product?.name || '')
          .toLowerCase()
          .includes(keyword) ||
        String(product?.sku || '')
          .toLowerCase()
          .includes(keyword)

      const matchesCategory = filterCategory
        ? getId(product?.category_id) === filterCategory
        : true

      const matchesBrand = filterBrand
        ? getId(product?.brand_id) === filterBrand
        : true

      return matchesSearch && matchesCategory && matchesBrand
    })
  }, [products, searchQuery, filterCategory, filterBrand])

  const handleProductChange = (event) => {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    setError('')
    setMessage('')
  }

  const handleVariantChange = (index, event) => {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              [name]: type === 'checkbox' ? checked : value,
              ...(name === 'image'
                ? {
                    preview_url: '',
                    image_broken: false,
                  }
                : {}),
            }
          : variant,
      ),
    }))

    setError('')
    setMessage('')
  }

  const handleAddVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant()],
    }))
  }

  const handleRemoveVariant = (index) => {
    setForm((prev) => {
      if (prev.variants.length <= 1) return prev

      return {
        ...prev,
        variants: prev.variants.filter(
          (_variant, variantIndex) => variantIndex !== index,
        ),
      }
    })
  }

  const handleImageImport = async (index, event) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) return

    const allowedTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ])

    if (!allowedTypes.has(file.type)) {
      input.value = ''
      setError('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      input.value = ''
      setError('Ảnh sản phẩm không được vượt quá 5 MB.')
      return
    }

    const previewUrl = URL.createObjectURL(file)

    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              preview_url: previewUrl,
              image_broken: false,
            }
          : variant,
      ),
    }))

    try {
      setUploadingVariantIndex(index)
      setError('')
      setMessage(`Đang tải ảnh phiên bản ${index + 1} lên Cloudinary...`)

      const response = await uploadProductImage(file)
      const imageUrl =
        response?.data?.url ||
        response?.data?.secure_url ||
        response?.url ||
        response?.secure_url ||
        response?.data?.data?.url ||
        response?.data?.data?.secure_url ||
        ''

      if (!imageUrl) {
        throw new Error('API upload không trả về URL ảnh Cloudinary.')
      }

      setForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                image: imageUrl,
                preview_url: '',
                image_broken: false,
              }
            : variant,
        ),
      }))

      setMessage(`Đã tải ảnh phiên bản ${index + 1} lên Cloudinary.`)
    } catch (uploadError) {
      setForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                preview_url: '',
              }
            : variant,
        ),
      }))

      setError(
        getErrorMessage(
          uploadError,
          'Không tải được ảnh sản phẩm. Kiểm tra Cloudinary và đăng nhập lại.',
        ),
      )
      setMessage('')
    } finally {
      URL.revokeObjectURL(previewUrl)
      input.value = ''
      setUploadingVariantIndex(-1)
    }
  }

  const handleImagePreviewError = (index) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              image_broken: true,
            }
          : variant,
      ),
    }))
  }

  const handleOpenModal = async (product = null) => {
    setError('')
    setMessage('')

    if (!product) {
      if (!canCreateOrDelete) {
        setError('STAFF chỉ được chỉnh sửa sản phẩm hiện có.')
        return
      }

      setEditingId('')
      setForm(createInitialForm())
      setShowModal(true)
      return
    }

    const productId = getId(product)

    try {
      setIsLoadingEditor(true)
      const response = await getProductById(productId)
      const detail = normalizeDetailResponse(response)
      const detailedProduct = detail.product || product
      const detailedVariants = detail.variants || []

      setEditingId(productId)
      setForm({
        name: detailedProduct?.name || '',
        sku: detailedProduct?.sku || '',
        description: detailedProduct?.description || '',
        brand_id: getId(detailedProduct?.brand_id),
        category_id: getId(detailedProduct?.category_id),
        status: detailedProduct?.status || 'active',
        is_featured: Boolean(detailedProduct?.is_featured),
        variants:
          detailedVariants.length > 0
            ? detailedVariants.map(normalizeVariantForForm)
            : [createEmptyVariant()],
      })
      setShowModal(true)
    } catch (detailError) {
      setError(
        getErrorMessage(
          detailError,
          'Không tải được đầy đủ thông tin sản phẩm.',
        ),
      )
    } finally {
      setIsLoadingEditor(false)
    }
  }

  const handleCloseModal = () => {
    if (isSaving || uploadingVariantIndex >= 0) return

    setShowModal(false)
    setEditingId('')
    setForm(createInitialForm())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const payload = validateAndBuildPayload(form)

      if (editingId) {
        await updateProduct(editingId, payload)
        setMessage('Đã cập nhật đầy đủ thông tin sản phẩm.')
      } else {
        if (!canCreateOrDelete) {
          throw new Error('Bạn không có quyền tạo sản phẩm mới.')
        }

        await createProduct(payload)
        setMessage('Đã tạo sản phẩm cùng các phiên bản.')
      }

      setShowModal(false)
      setEditingId('')
      setForm(createInitialForm())
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được sản phẩm.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!canCreateOrDelete) {
      setError('STAFF không có quyền xóa sản phẩm.')
      return
    }

    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return

    try {
      setError('')
      setMessage('')
      await deleteProduct(id)
      setMessage('Đã xóa sản phẩm.')
      await load()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được sản phẩm.'))
    }
  }

  return (
    <DashboardLayout
      title='Quản lý sản phẩm'
      description={
        role === 'STAFF'
          ? 'Chỉnh sửa thông tin, giá, tồn kho, phiên bản và ảnh sản phẩm.'
          : 'Quản lý đầy đủ sản phẩm, phiên bản, giá, tồn kho và ảnh.'
      }
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface mb-4 overflow-hidden'>
        <Card.Body className='p-4'>
          <Row className='g-3 align-items-stretch'>
            <Col xl={4} lg={12}>
              <Form.Control
                type='text'
                placeholder='Tìm sản phẩm theo tên hoặc SKU...'
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className='h-100 min-h-[48px] !rounded-xl border-slate-200 px-4 shadow-none'
              />
            </Col>

            <Col xl={3} md={6}>
              <Form.Select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className='h-100 min-h-[48px] !rounded-xl border-slate-200 px-4 shadow-none'
              >
                <option value=''>Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={getId(category)} value={getId(category)}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col xl={3} md={6}>
              <Form.Select
                value={filterBrand}
                onChange={(event) => setFilterBrand(event.target.value)}
                className='h-100 min-h-[48px] !rounded-xl border-slate-200 px-4 shadow-none'
              >
                <option value=''>Tất cả thương hiệu</option>
                {brands.map((brand) => (
                  <option key={getId(brand)} value={getId(brand)}>
                    {brand.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col xl={2} lg={12}>
              {canCreateOrDelete ? (
                <Button
                  onClick={() => handleOpenModal()}
                  className='h-100 min-h-[48px] w-100 !rounded-xl whitespace-nowrap'
                >
                  + Thêm mới
                </Button>
              ) : (
                <div className='d-flex h-100 min-h-[48px] align-items-center justify-content-center !rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-500'>
                  STAFF: chỉ chỉnh sửa
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className='card-surface overflow-hidden'>
        <Card.Body className='p-0'>
          <div className='w-100 overflow-hidden'>
            <Table
              hover
              className='mb-0 w-100 align-middle'
              style={{
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: '33%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>

              <thead className='bg-slate-50'>
                <tr>
                  <th
                    className='border-bottom p-3 text-sm font-black text-slate-700'
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Sản phẩm
                  </th>
                  <th
                    className='border-bottom p-3 text-sm font-black text-slate-700'
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Thương hiệu / Danh mục
                  </th>
                  <th
                    className='border-bottom p-3 text-sm font-black text-slate-700'
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Giá & Kho
                  </th>
                  <th
                    className='border-bottom p-3 text-center text-sm font-black text-slate-700'
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Trạng thái
                  </th>
                  <th
                    className='border-bottom p-3 text-end text-sm font-black text-slate-700'
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan='5'
                      className='py-5 text-center text-slate-500'
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan='5'
                      className='py-5 text-center text-slate-500'
                    >
                      Không tìm thấy sản phẩm nào.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const productImage = getProductImage(product)

                    return (
                      <tr key={getId(product)}>
                        <td className='p-3'>
                          <div className='d-flex min-w-0 align-items-center gap-3'>
                            <div
                              className='d-flex flex-shrink-0 align-items-center justify-content-center overflow-hidden !rounded-xl border border-slate-200 bg-white'
                              style={{ width: 52, height: 52 }}
                            >
                              {productImage ? (
                                <img
                                  src={productImage}
                                  alt={product.name}
                                  className='h-100 w-100 object-fit-contain p-2'
                                />
                              ) : (
                                <i className='bi bi-box fs-4 text-slate-300' />
                              )}
                            </div>

                            <div className='min-w-0 flex-grow-1'>
                              <div
                                className='text-truncate font-bold text-slate-900'
                                title={product.name}
                              >
                                {product.name}
                              </div>

                              <div className='mt-2 d-flex min-w-0 flex-wrap align-items-center gap-2 text-xs text-slate-500'>
                                <span className='d-inline-flex align-items-center gap-1'>
                                  <i className='bi bi-upc-scan' />
                                  <span
                                    className='text-truncate'
                                    style={{ maxWidth: 180 }}
                                    title={product.sku}
                                  >
                                    {product.sku}
                                  </span>
                                </span>

                                {product.is_featured && (
                                  <span className='!rounded-pill bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-600'>
                                    Nổi bật
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className='p-3'>
                          <div
                            className='text-truncate text-sm text-slate-700'
                            title={product.brand_id?.name || '-'}
                          >
                            <span className='font-bold'>Thương hiệu:</span>{' '}
                            <span>{product.brand_id?.name || '-'}</span>
                          </div>
                          <div
                            className='mt-2 text-truncate text-sm text-slate-500'
                            title={product.category_id?.name || '-'}
                          >
                            <span className='font-bold'>Danh mục:</span>{' '}
                            <span>{product.category_id?.name || '-'}</span>
                          </div>
                        </td>

                        <td className='p-3'>
                          <div style={{ whiteSpace: 'nowrap' }}>
                            <PriceText
                              value={getProductPrice(product)}
                              className='font-bold text-orange-600'
                            />
                          </div>

                          <div className='mt-2 text-xs text-slate-500'>
                            Tồn kho: <b>{getStock(product)}</b>
                          </div>

                          <div className='mt-1 text-xs text-slate-500'>
                            {Array.isArray(product.variants)
                              ? product.variants.length
                              : 0}{' '}
                            phiên bản đang hoạt động
                          </div>
                        </td>

                        <td className='p-3 text-center'>
                          <div
                            className='d-inline-flex justify-content-center'
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <StatusBadge value={product.status} />
                          </div>
                        </td>

                        <td className='p-3 text-end'>
                          <div className='d-flex justify-content-end gap-2'>
                            <button
                              type='button'
                              className='btn btn-light btn-sm d-flex align-items-center justify-content-center !rounded-circle text-blue-600'
                              style={{
                                width: 38,
                                height: 38,
                                flexShrink: 0,
                              }}
                              onClick={() => handleOpenModal(product)}
                              disabled={isLoadingEditor}
                              title='Sửa đầy đủ thông tin'
                            >
                              <i className='bi bi-pencil-fill' />
                            </button>

                            {canCreateOrDelete && (
                              <button
                                type='button'
                                className='btn btn-light btn-sm d-flex align-items-center justify-content-center !rounded-circle text-red-500'
                                style={{
                                  width: 38,
                                  height: 38,
                                  flexShrink: 0,
                                }}
                                onClick={() => handleDelete(getId(product))}
                                title='Xóa sản phẩm'
                              >
                                <i className='bi bi-trash-fill' />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        size='xl'
        centered
        backdrop={isSaving ? 'static' : true}
        keyboard={!isSaving}
        contentClassName='overflow-hidden'
      >
        <Form
          onSubmit={handleSubmit}
          className='d-flex flex-column overflow-hidden'
          style={{ maxHeight: 'calc(100vh - 32px)' }}
        >
          <Modal.Header
            closeButton={!isSaving}
            className='flex-shrink-0'
          >
            <Modal.Title className='font-black text-slate-900'>
              {editingId
                ? 'Cập nhật đầy đủ sản phẩm'
                : 'Thêm sản phẩm mới'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body
            className='flex-grow-1 overflow-auto bg-slate-50'
            style={{
              minHeight: 0,
              maxHeight: 'calc(100vh - 180px)',
            }}
          >
            <div className='sticky top-0 z-20 mb-3'>
              <Alert type='danger'>{error}</Alert>
              <Alert type='success'>{message}</Alert>
            </div>

            <Card className='mb-4 border-0 shadow-sm'>
              <Card.Body className='p-4'>
                <h3 className='mb-3 text-lg font-black text-slate-900'>
                  Thông tin chung
                </h3>

                <Row className='g-3'>
                  <Col md={6}>
                    <TextField
                      label='Tên sản phẩm'
                      name='name'
                      value={form.name}
                      onChange={handleProductChange}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <TextField
                      label='SKU sản phẩm'
                      name='sku'
                      value={form.sku}
                      onChange={handleProductChange}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <SelectField
                      label='Thương hiệu'
                      name='brand_id'
                      value={form.brand_id}
                      onChange={handleProductChange}
                      options={[
                        { value: '', label: 'Chọn thương hiệu' },
                        ...brands.map((brand) => ({
                          value: getId(brand),
                          label: brand.name,
                        })),
                      ]}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <SelectField
                      label='Danh mục'
                      name='category_id'
                      value={form.category_id}
                      onChange={handleProductChange}
                      options={[
                        { value: '', label: 'Chọn danh mục' },
                        ...categories.map((category) => ({
                          value: getId(category),
                          label: category.name,
                        })),
                      ]}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <SelectField
                      label='Trạng thái hiển thị'
                      name='status'
                      value={form.status}
                      onChange={handleProductChange}
                      options={[
                        { value: 'active', label: 'Đang bán' },
                        { value: 'inactive', label: 'Ngừng bán' },
                        { value: 'out_of_stock', label: 'Hết hàng' },
                      ]}
                    />
                  </Col>

                  <Col md={6} className='d-flex align-items-center pt-4'>
                    <Form.Check
                      type='checkbox'
                      id='product-featured'
                      name='is_featured'
                      checked={form.is_featured}
                      onChange={handleProductChange}
                      label='Sản phẩm nổi bật'
                      className='font-bold text-slate-700'
                    />
                  </Col>

                  <Col xs={12}>
                    <TextAreaField
                      label='Mô tả sản phẩm'
                      name='description'
                      value={form.description}
                      onChange={handleProductChange}
                      rows={4}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <div className='mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3'>
              <div>
                <h3 className='mb-1 text-lg font-black text-slate-900'>
                  Phiên bản sản phẩm
                </h3>
                <p className='mb-0 text-sm text-slate-500'>
                  Chỉnh giá, giá giảm, tồn kho, ảnh, khối lượng và thuộc tính.
                </p>
              </div>

              <Button
                type='button'
                variant='outline'
                onClick={handleAddVariant}
                disabled={isSaving}
              >
                + Thêm phiên bản
              </Button>
            </div>

            <div className='d-flex flex-column gap-3'>
              {form.variants.map((variant, index) => (
                <Card
                  key={variant._id || `new-variant-${index}`}
                  className='border-0 shadow-sm'
                >
                  <Card.Body className='p-4'>
                    <div className='mb-3 d-flex align-items-center justify-content-between gap-3'>
                      <h4 className='mb-0 text-base font-black text-slate-900'>
                        Phiên bản {index + 1}
                      </h4>

                      <Button
                        type='button'
                        variant='danger'
                        size='sm'
                        onClick={() => handleRemoveVariant(index)}
                        disabled={form.variants.length <= 1 || isSaving}
                      >
                        Xóa phiên bản
                      </Button>
                    </div>

                    <Row className='g-3'>
                      <Col lg={4}>
                        <div className='h-100 !rounded-4 border border-slate-200 bg-slate-50 p-3'>
                          <div
                            className='mb-3 d-flex align-items-center justify-content-center overflow-hidden !rounded-4 border bg-white'
                            style={{ height: 210 }}
                          >
                            {(variant.preview_url || variant.image) &&
                            !variant.image_broken ? (
                              <img
                                src={variant.preview_url || variant.image}
                                alt={`Phiên bản ${index + 1}`}
                                className='h-100 w-100 object-fit-contain p-3'
                                onError={() => handleImagePreviewError(index)}
                              />
                            ) : (
                              <div className='px-3 text-center text-slate-400'>
                                <i className='bi bi-image fs-1' />
                                <p className='mb-0 mt-2 text-sm'>
                                  {variant.image
                                    ? 'URL ảnh hiện tại không tải được'
                                    : 'Chưa có ảnh'}
                                </p>
                              </div>
                            )}
                          </div>

                          <Form.Label className='text-sm font-bold text-slate-700'>
                            Import ảnh từ máy
                          </Form.Label>
                          <Form.Control
                            type='file'
                            accept='.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif'
                            onChange={(event) =>
                              handleImageImport(index, event)
                            }
                            disabled={
                              isSaving || uploadingVariantIndex === index
                            }
                            className='mb-3'
                          />

                          <p className='mb-3 text-xs text-slate-500'>
                            Chọn ảnh sẽ tự upload lên Cloudinary. Tối đa 5 MB.
                          </p>

                          {uploadingVariantIndex === index && (
                            <p className='mb-3 text-sm font-semibold text-blue-600'>
                              Đang tải ảnh lên Cloudinary...
                            </p>
                          )}

                          <TextField
                            label='URL ảnh'
                            name='image'
                            value={variant.image}
                            onChange={(event) =>
                              handleVariantChange(index, event)
                            }
                            placeholder='Ảnh upload sẽ tự điền URL'
                          />
                        </div>
                      </Col>

                      <Col lg={8}>
                        <Row className='g-3'>
                          <Col md={6}>
                            <TextField
                              label='SKU phiên bản'
                              name='sku'
                              value={variant.sku}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              required
                            />
                          </Col>

                          <Col md={6}>
                            <TextField
                              label='Tên phiên bản'
                              name='variant_value'
                              value={variant.variant_value}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              placeholder='Ví dụ: 256GB - Đen'
                              required
                            />
                          </Col>

                          <Col md={4}>
                            <TextField
                              label='Giá gốc'
                              name='price'
                              type='number'
                              min='0'
                              step='1000'
                              value={variant.price}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              required
                            />
                          </Col>

                          <Col md={4}>
                            <TextField
                              label='Giá khuyến mãi'
                              name='sale_price'
                              type='number'
                              min='0'
                              step='1000'
                              value={variant.sale_price}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                            />
                          </Col>

                          <Col md={4}>
                            <TextField
                              label='Tồn kho'
                              name='stock_quantity'
                              type='number'
                              min='0'
                              step='1'
                              value={variant.stock_quantity}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              required
                            />
                          </Col>

                          <Col md={6}>
                            <TextField
                              label='Khối lượng (kg)'
                              name='weight'
                              type='text'
                              inputMode='decimal'
                              value={variant.weight}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              placeholder='Ví dụ: 0,18 hoặc 0.18'
                            />
                            <p className='mb-0 mt-1 text-xs text-slate-500'>
                              Có thể nhập dấu phẩy hoặc dấu chấm thập phân.
                            </p>
                          </Col>

                          <Col md={6} className='d-flex align-items-center pt-4'>
                            <Form.Check
                              type='checkbox'
                              id={`variant-active-${index}`}
                              name='is_active'
                              checked={variant.is_active}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              label='Phiên bản đang hoạt động'
                              className='font-bold text-slate-700'
                            />
                          </Col>

                          <Col xs={12}>
                            <TextAreaField
                              label='Thuộc tính JSON'
                              name='attributes_text'
                              value={variant.attributes_text}
                              onChange={(event) =>
                                handleVariantChange(index, event)
                              }
                              rows={5}
                              placeholder={'{\n  "color": "Đen",\n  "storage": "256GB"\n}'}
                            />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Modal.Body>

          <Modal.Footer className='flex-shrink-0 bg-white'>
            <Button
              type='button'
              variant='light'
              onClick={handleCloseModal}
              disabled={isSaving || uploadingVariantIndex >= 0}
            >
              Hủy
            </Button>

            <Button
              type='submit'
              isLoading={isSaving}
              disabled={uploadingVariantIndex >= 0}
            >
              {editingId ? 'Lưu toàn bộ thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </DashboardLayout>
  )
}

export default ProductManagementPage
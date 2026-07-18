import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'

import MainLayout from '../../components/templates/MainLayout'
import ProductGrid from '../../components/organisms/ProductGrid'
import Alert from '../../components/atoms/Alert'
import EmptyState from '../../components/atoms/EmptyState'

import { getErrorMessage } from '../../services/api'
import {
  getBrands,
  getCategories,
  getProducts,
} from '../../services/product.service'
import { pickArray } from '../../utils/format'
import { getProductPrice } from '../../utils/product'

const PRODUCTS_PER_PAGE = 15

const initialFilters = {
  keyword: '',
  categoryId: '',
  brandId: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'latest',
}

const sortOptions = [
  {
    value: 'latest',
    label: 'Mới nhất',
  },
  {
    value: 'name-asc',
    label: 'Tên A-Z',
  },
  {
    value: 'name-desc',
    label: 'Tên Z-A',
  },
  {
    value: 'price-asc',
    label: 'Giá thấp - cao',
  },
  {
    value: 'price-desc',
    label: 'Giá cao - thấp',
  },
  {
    value: 'rating-desc',
    label: 'Đánh giá cao - thấp',
  },
  {
    value: 'rating-asc',
    label: 'Đánh giá thấp - cao',
  },
]

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

function getOptionId(item) {
  return item?._id || item?.id || ''
}

function getOptionName(item, fallback = 'Tùy chọn') {
  return item?.name || item?.category_name || item?.brand_name || fallback
}

function toNumber(value) {
  const numberValue = Number(String(value || '').replace(/\D/g, ''))

  return Number.isFinite(numberValue) ? numberValue : 0
}

function sortProducts(products, sortBy) {
  const copied = [...products]

  copied.sort((a, b) => {
    if (sortBy === 'name-asc') {
      return String(a.name || '').localeCompare(String(b.name || ''))
    }

    if (sortBy === 'name-desc') {
      return String(b.name || '').localeCompare(String(a.name || ''))
    }

    if (sortBy === 'price-asc') {
      return getProductPrice(a) - getProductPrice(b)
    }

    if (sortBy === 'price-desc') {
      return getProductPrice(b) - getProductPrice(a)
    }

    if (sortBy === 'rating-desc') {
      return Number(b.average_rating || 0) - Number(a.average_rating || 0)
    }

    if (sortBy === 'rating-asc') {
      return Number(a.average_rating || 0) - Number(b.average_rating || 0)
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })

  return copied
}

function filterProductsByPrice(products, minPrice, maxPrice) {
  const hasMinPrice = String(minPrice || '').trim() !== ''
  const hasMaxPrice = String(maxPrice || '').trim() !== ''

  if (!hasMinPrice && !hasMaxPrice) return products

  const min = toNumber(minPrice)
  const max = toNumber(maxPrice)

  return products.filter((product) => {
    const price = Number(getProductPrice(product) || 0)

    if (hasMinPrice && price < min) return false
    if (hasMaxPrice && price > max) return false

    return true
  })
}

function SelectField({ label, icon, name, value, onChange, children }) {
  return (
    <Form.Group className='mb-4'>
      <Form.Label className='mb-2 d-flex align-items-center gap-2 text-sm font-black text-slate-700'>
        <span
          className='d-flex align-items-center justify-content-center rounded-circle bg-orange-50 text-orange-600'
          style={{
            width: 28,
            height: 28,
          }}
        >
          <i className={`bi ${icon}`} />
        </span>

        {label}
      </Form.Label>

      <Form.Select
        name={name}
        value={value}
        onChange={onChange}
        className='rounded-4 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm'
      >
        {children}
      </Form.Select>
    </Form.Group>
  )
}

function PriceRangeField({
  minPrice,
  maxPrice,
  onMinChange,
  onMaxChange,
}) {
  return (
    <Form.Group className='mb-4'>
      <Form.Label className='mb-2 d-flex align-items-center gap-2 text-sm font-black text-slate-700'>
        <span
          className='d-flex align-items-center justify-content-center rounded-circle bg-orange-50 text-orange-600'
          style={{
            width: 28,
            height: 28,
          }}
        >
          <i className='bi bi-cash-stack' />
        </span>

        Khoảng giá
      </Form.Label>

      <Row className='g-2'>
        <Col xs={6}>
          <Form.Control
            type='text'
            inputMode='numeric'
            name='minPrice'
            value={minPrice}
            onChange={onMinChange}
            placeholder='Từ'
            className='rounded-4 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 shadow-sm'
          />
        </Col>

        <Col xs={6}>
          <Form.Control
            type='text'
            inputMode='numeric'
            name='maxPrice'
            value={maxPrice}
            onChange={onMaxChange}
            placeholder='Đến'
            className='rounded-4 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 shadow-sm'
          />
        </Col>
      </Row>

      {(minPrice || maxPrice) && (
        <div className='mt-2 rounded-4 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700'>
          {minPrice ? `${formatNumber(toNumber(minPrice))}đ` : '0đ'} -{' '}
          {maxPrice ? `${formatNumber(toNumber(maxPrice))}đ` : 'Không giới hạn'}
        </div>
      )}
    </Form.Group>
  )
}

function PaginationButton({ active, disabled, children, onClick }) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={`d-flex align-items-center justify-content-center rounded-circle border text-sm font-black transition ${
        active
          ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700'
      }`}
      style={{
        width: 42,
        height: 42,
      }}
    >
      {children}
    </button>
  )
}

function ProductPagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
}) {
  if (totalItems === 0 || totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className='mt-5 d-flex flex-wrap align-items-center justify-content-center gap-3'>
      <div className='d-flex flex-wrap align-items-center gap-2'>
        <PaginationButton
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <i className='bi bi-chevron-left' />
        </PaginationButton>

        {pages.map((page) => (
          <PaginationButton
            key={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          >
            {page}
          </PaginationButton>
        ))}

        <PaginationButton
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <i className='bi bi-chevron-right' />
        </PaginationButton>
      </div>
    </div>
  )
}

function ProductListPage() {
  const [searchParams] = useSearchParams()

  const keywordFromUrl = searchParams.get('keyword') || ''
  const categoryIdFromUrl = searchParams.get('categoryId') || ''
  const brandIdFromUrl = searchParams.get('brandId') || ''

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])

  const [filters, setFilters] = useState({
    ...initialFilters,
    keyword: keywordFromUrl,
    categoryId: categoryIdFromUrl,
    brandId: brandIdFromUrl,
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      keyword: keywordFromUrl,
      categoryId: categoryIdFromUrl,
      brandId: brandIdFromUrl,
    }))

    setCurrentPage(1)
  }, [keywordFromUrl, categoryIdFromUrl, brandIdFromUrl])

  useEffect(() => {
    let mounted = true

    const loadOptions = async () => {
      try {
        const [categoryRes, brandRes] = await Promise.all([
          getCategories({
            status: 'active',
          }),
          getBrands({
            status: 'active',
          }),
        ])

        if (!mounted) return

        setCategories(pickArray(categoryRes, []))
        setBrands(pickArray(brandRes, []))
      } catch (error) {
        if (!mounted) return

        setCategories([])
        setBrands([])
        setError(
          getErrorMessage(
            error,
            'Không tải được category/brand từ backend.',
          ),
        )
      }
    }

    loadOptions()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      try {
        setIsLoading(true)
        setError('')

        const params = { status: 'active' }

        if (filters.keyword.trim()) {
          params.q = filters.keyword.trim()
        }

        if (filters.categoryId) {
          params.category_id = filters.categoryId
        }

        if (filters.brandId) {
          params.brand_id = filters.brandId
        }

        const response = await getProducts(params)

        if (!mounted) return

        setProducts(pickArray(response, []))
      } catch (error) {
        if (!mounted) return

        setProducts([])
        setError(
          getErrorMessage(
            error,
            'Không tải được products từ backend. Hãy kiểm tra API /product.',
          ),
        )
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      mounted = false
    }
  }, [filters.keyword, filters.categoryId, filters.brandId])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    filters.keyword,
    filters.categoryId,
    filters.brandId,
    filters.minPrice,
    filters.maxPrice,
    filters.sortBy,
  ])

  const visibleProducts = useMemo(() => {
    const priceFilteredProducts = filterProductsByPrice(
      products,
      filters.minPrice,
      filters.maxPrice,
    )

    return sortProducts(priceFilteredProducts, filters.sortBy)
  }, [products, filters.minPrice, filters.maxPrice, filters.sortBy])

  const totalProducts = visibleProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE
  const endIndex = startIndex + PRODUCTS_PER_PAGE
  const paginatedProducts = visibleProducts.slice(startIndex, endIndex)
  const startItem = totalProducts === 0 ? 0 : startIndex + 1
  const endItem = Math.min(endIndex, totalProducts)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleFilterChange = (event) => {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePriceChange = (event) => {
    const { name, value } = event.target
    const onlyNumber = String(value || '').replace(/\D/g, '')

    setFilters((prev) => ({
      ...prev,
      [name]: onlyNumber,
    }))
  }

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <MainLayout>
      <section className='bg-slate-50 py-5'>
        <Container>
          <Alert type='danger'>{error}</Alert>

          <Row className='g-4 align-items-start'>
            <Col xs={12} lg={3}>
              <Card
                className='position-sticky overflow-hidden border-0 bg-white shadow-lg'
                style={{
                  top: 96,
                  zIndex: 10,
                  borderRadius: 28,
                }}
              >
                <div className='bg-gradient-to-br from-orange-500 to-amber-400 p-4 text-white'>
                  <div className='d-flex align-items-center justify-content-between gap-3'>
                    <div>
                      <h2 className='mb-0 text-3xl font-black'>Bộ lọc</h2>
                    </div>

                    <span
                      className='d-flex align-items-center justify-content-center rounded-circle bg-white/20'
                      style={{
                        width: 52,
                        height: 52,
                      }}
                    >
                      <i className='bi bi-funnel-fill fs-4' />
                    </span>
                  </div>
                </div>

                <Card.Body className='p-4'>
                  <Form>
                    <SelectField
                      label='Danh mục'
                      icon='bi-grid-3x3-gap-fill'
                      name='categoryId'
                      value={filters.categoryId}
                      onChange={handleFilterChange}
                    >
                      <option value=''>Tất cả danh mục</option>

                      {categories.map((category) => (
                        <option
                          key={getOptionId(category)}
                          value={getOptionId(category)}
                        >
                          {getOptionName(category, 'Danh mục')}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      label='Thương hiệu'
                      icon='bi-award-fill'
                      name='brandId'
                      value={filters.brandId}
                      onChange={handleFilterChange}
                    >
                      <option value=''>Tất cả thương hiệu</option>

                      {brands.map((brand) => (
                        <option
                          key={getOptionId(brand)}
                          value={getOptionId(brand)}
                        >
                          {getOptionName(brand, 'Thương hiệu')}
                        </option>
                      ))}
                    </SelectField>

                    <PriceRangeField
                      minPrice={filters.minPrice}
                      maxPrice={filters.maxPrice}
                      onMinChange={handlePriceChange}
                      onMaxChange={handlePriceChange}
                    />

                    <SelectField
                      label='Sắp xếp'
                      icon='bi-sort-down-alt'
                      name='sortBy'
                      value={filters.sortBy}
                      onChange={handleFilterChange}
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={9}>
              {isLoading || totalProducts > 0 ? (
                <>
                  <ProductGrid
                    products={paginatedProducts}
                    isLoading={isLoading}
                  />

                  {!isLoading && (
                    <ProductPagination
                      currentPage={safeCurrentPage}
                      totalPages={totalPages}
                      totalItems={totalProducts}
                      startItem={startItem}
                      endItem={endItem}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  icon='🔎'
                  title='Không tìm thấy sản phẩm'
                  description='Hãy thử đổi bộ lọc hoặc khoảng giá.'
                />
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </MainLayout>
  )
}

export default ProductListPage
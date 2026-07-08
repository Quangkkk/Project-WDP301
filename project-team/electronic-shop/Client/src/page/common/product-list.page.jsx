import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'

import MainLayout from '../../components/templates/MainLayout'
import ProductGrid from '../../components/organisms/ProductGrid'
import Alert from '../../components/atoms/Alert'
import { getErrorMessage } from '../../services/api'
import { getBrands, getCategories, getProducts } from '../../services/product.service'
import { pickArray } from '../../utils/format'
import { getProductPrice } from '../../utils/product'

const initialFilters = {
  keyword: '',
  categoryId: '',
  brandId: '',
  sortBy: 'latest',
}

function sortProducts(products, sortBy) {
  const copied = [...products]

  copied.sort((a, b) => {
    if (sortBy === 'name-asc') {
      return String(a.name || '').localeCompare(String(b.name || ''))
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

    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })

  return copied
}

function ProductListPage() {
  const navigate = useNavigate()
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

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      keyword: keywordFromUrl,
      categoryId: categoryIdFromUrl,
      brandId: brandIdFromUrl,
    }))
  }, [keywordFromUrl, categoryIdFromUrl, brandIdFromUrl])

  useEffect(() => {
    let mounted = true

    const loadOptions = async () => {
      try {
        const [categoryRes, brandRes] = await Promise.all([
          getCategories({ status: 'active' }),
          getBrands({ status: 'active' }),
        ])

        if (!mounted) return

        setCategories(pickArray(categoryRes, []))
        setBrands(pickArray(brandRes, []))
      } catch (error) {
        if (!mounted) return

        setCategories([])
        setBrands([])
        setError(getErrorMessage(error, 'Không tải được category/brand từ backend.'))
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
        setError(getErrorMessage(error, 'Không tải được products từ backend. Hãy kiểm tra API /product.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadProducts()

    return () => {
      mounted = false
    }
  }, [filters.keyword, filters.categoryId, filters.brandId])

  const visibleProducts = useMemo(() => {
    return sortProducts(products, filters.sortBy)
  }, [products, filters.sortBy])

  const handleFilterChange = (event) => {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleResetFilters = () => {
    setFilters(initialFilters)
    navigate('/products', { replace: true })
  }

  const handleClearSearch = () => {
    setFilters((prev) => ({
      ...prev,
      keyword: '',
    }))

    navigate('/products', { replace: true })
  }

  return (
    <MainLayout>
      <section className='bg-slate-50 py-5'>
        <Container>
          <div className='mb-4'>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.35em] text-orange-600'>
              Shopping
            </p>

            <h1 className='mb-0 text-4xl font-black tracking-tight text-slate-900'>
              Product List
            </h1>
          </div>

          <Alert type='danger'>{error}</Alert>

          <Row className='g-4 align-items-start'>
            <Col xs={12} lg={3}>
              <Card
                className='border-0 shadow-sm position-sticky'
                style={{ top: 96, zIndex: 10 }}
              >
                <Card.Body className='p-4'>
                  <div className='mb-4 d-flex align-items-center justify-content-between'>
                    <h2 className='mb-0 text-lg font-black text-slate-900'>
                      Filter
                    </h2>

                    <Button
                      variant='link'
                      className='p-0 text-sm font-bold text-orange-600 text-decoration-none'
                      onClick={handleResetFilters}
                    >
                      Reset
                    </Button>
                  </div>

                  <Form>
                    <Form.Group className='mb-3'>
                      <Form.Label className='text-sm font-bold text-slate-700'>
                        Category
                      </Form.Label>

                      <Form.Select
                        name='categoryId'
                        value={filters.categoryId}
                        onChange={handleFilterChange}
                        className='rounded-3 border-slate-200'
                      >
                        <option value=''>All categories</option>

                        {categories.map((category) => (
                          <option
                            key={category._id || category.id}
                            value={category._id || category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className='mb-3'>
                      <Form.Label className='text-sm font-bold text-slate-700'>
                        Brand
                      </Form.Label>

                      <Form.Select
                        name='brandId'
                        value={filters.brandId}
                        onChange={handleFilterChange}
                        className='rounded-3 border-slate-200'
                      >
                        <option value=''>All brands</option>

                        {brands.map((brand) => (
                          <option
                            key={brand._id || brand.id}
                            value={brand._id || brand.id}
                          >
                            {brand.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className='mb-4'>
                      <Form.Label className='text-sm font-bold text-slate-700'>
                        Sort by
                      </Form.Label>

                      <Form.Select
                        name='sortBy'
                        value={filters.sortBy}
                        onChange={handleFilterChange}
                        className='rounded-3 border-slate-200'
                      >
                        <option value='latest'>Latest</option>
                        <option value='name-asc'>Name A-Z</option>
                        <option value='price-asc'>Price low to high</option>
                        <option value='price-desc'>Price high to low</option>
                        <option value='rating-desc'>Best rating</option>
                      </Form.Select>
                    </Form.Group>

                    <Button
                      type='button'
                      variant='dark'
                      className='w-100 rounded-3 py-2 font-bold'
                      onClick={handleResetFilters}
                    >
                      Clear filters
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={9}>
              <div className='mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3'>
                <div>
                  <p className='mb-0 text-sm font-bold text-slate-500'>
                    Showing {visibleProducts.length} products from backend
                  </p>

                  {filters.keyword && (
                    <p className='mb-0 mt-1 text-sm text-slate-500'>
                      Search keyword:{' '}
                      <span className='font-bold text-slate-900'>
                        {filters.keyword}
                      </span>
                    </p>
                  )}
                </div>

                {filters.keyword && (
                  <Button
                    type='button'
                    variant='outline-secondary'
                    className='rounded-pill px-3 text-sm font-bold'
                    onClick={handleClearSearch}
                  >
                    Clear search
                  </Button>
                )}
              </div>

              <ProductGrid products={visibleProducts} isLoading={isLoading} />
            </Col>
          </Row>
        </Container>
      </section>
    </MainLayout>
  )
}

export default ProductListPage
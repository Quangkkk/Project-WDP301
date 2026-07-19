import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import { useNavigate } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { getProductById } from '../../services/product.service'
import {
  getWishlist,
  removeWishlistById,
  removeWishlistByUserAndProduct,
} from '../../services/wishlist.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { getId, pickArray, pickData } from '../../utils/format'
import {
  getProductImage,
  getProductOriginalPrice,
  getProductPrice,
  getStock,
} from '../../utils/product'

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

function getWishlistProduct(item) {
  const product =
    item?.product_id ||
    item?.product ||
    item?.productId ||
    item?.product_info ||
    item?.productInfo

  return product || null
}

function getWishlistProductId(item) {
  const product = getWishlistProduct(item)

  if (typeof product === 'string') return product

  return getId(product) || item?.product_id || item?.productId || ''
}

function getWishlistCreatedDate(item) {
  const value = item?.created_at || item?.createdAt

  if (!value) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getWishlistCreatedTime(item) {
  const value = item?.created_at || item?.createdAt

  if (!value) return 0

  return new Date(value).getTime()
}

function getProductVariant(product) {
  return product?.variants?.[0] || null
}

function getBrandInfo(product) {
  const brand = product?.brand_id || product?.brand || product?.brandId

  if (brand && typeof brand === 'object') {
    return {
      id: getId(brand) || brand.name || brand.brand_name || '',
      name: brand.name || brand.brand_name || 'Brand',
    }
  }

  return {
    id: brand || product?.brand_name || 'unknown-brand',
    name: product?.brand_name || 'Brand',
  }
}

function getCategoryInfo(product) {
  const category =
    product?.category_id || product?.category || product?.categoryId

  if (category && typeof category === 'object') {
    return {
      id: getId(category) || category.name || category.category_name || '',
      name: category.name || category.category_name || 'Electronic',
    }
  }

  return {
    id: category || product?.category_name || 'unknown-category',
    name: product?.category_name || 'Electronic',
  }
}

function getBrandName(product) {
  return getBrandInfo(product).name
}

function getCategoryName(product) {
  return getCategoryInfo(product).name
}

function getEntryPrice(entry) {
  const product = entry?.product
  const variant = getProductVariant(product)

  return Number(getProductPrice(product, variant) || 0)
}

function getEntryStock(entry) {
  const product = entry?.product
  const variant = getProductVariant(product)

  return Number(getStock(product, variant) || 0)
}

function getEntryName(entry) {
  return String(entry?.product?.name || '').toLowerCase()
}

function getEntryCreatedTime(entry) {
  return getWishlistCreatedTime(entry?.item)
}

function getEntryBrandId(entry) {
  return String(getBrandInfo(entry?.product).id || '')
}

function getEntryCategoryId(entry) {
  return String(getCategoryInfo(entry?.product).id || '')
}

function createUniqueFilterOptions(entries, getter) {
  const map = new Map()

  entries.forEach((entry) => {
    const info = getter(entry?.product)
    const id = String(info.id || '')
    const name = String(info.name || '').trim()

    if (!id || !name) return

    if (!map.has(id)) {
      map.set(id, {
        value: id,
        label: name,
      })
    }
  })

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

const stockFilterOptions = [
  {
    value: 'all',
    label: 'Tất cả',
    icon: 'bi-funnel',
  },
  {
    value: 'in_stock',
    label: 'Còn hàng',
    icon: 'bi-truck',
  },
  {
    value: 'out_of_stock',
    label: 'Hết hàng',
    icon: 'bi-x-circle',
  },
]

const sortOptions = [
  {
    value: 'price_asc',
    label: 'Giá Thấp - Cao',
    icon: 'bi-sort-up',
  },
  {
    value: 'price_desc',
    label: 'Giá Cao - Thấp',
    icon: 'bi-sort-down',
  },
  {
    value: 'name_asc',
    label: 'Tên A-Z',
    icon: 'bi-sort-alpha-down',
  },
  {
    value: 'name_desc',
    label: 'Tên Z-A',
    icon: 'bi-sort-alpha-up',
  },
]

function FilterPill({ active, icon, children, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`d-inline-flex align-items-center gap-2 !rounded-4 border px-4 py-3 text-sm font-bold transition ${
        active
          ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm'
          : 'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200'
      }`}
    >
      {icon && <i className={`bi ${icon}`} />}
      {children}
    </button>
  )
}

function StockBadge({ stock }) {
  const isInStock = Number(stock || 0) > 0

  return (
    <span
      className={`!rounded-pill px-3 py-2 text-xs font-black ${
        isInStock
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
    >
      {isInStock ? 'Còn hàng' : 'Hết hàng'}
    </span>
  )
}

function WishlistProductCard({ entry, isRemoving, onRemove }) {
  const { item, product } = entry

  const navigate = useNavigate()
  const variant = getProductVariant(product)
  const productId = getId(product)
  const image = getProductImage(product, variant)
  const price = getProductPrice(product, variant)
  const original = getProductOriginalPrice(product, variant)
  const stock = getStock(product, variant)
  const createdDate = getWishlistCreatedDate(item)

  const handleGoToDetail = () => {
    navigate(`/products/${productId}`)
  }

  const handleRemoveClick = (event) => {
    event.stopPropagation()
    event.preventDefault()
    onRemove(entry)
  }

  return (
    <Card
      role='button'
      tabIndex={0}
      onClick={handleGoToDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          handleGoToDetail()
        }
      }}
      className='h-100 overflow-hidden border-0 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl'
      style={{
        cursor: 'pointer',
      }}
    >
      <div
        className='position-relative d-flex align-items-center justify-content-center bg-gradient-to-br from-slate-100 to-orange-50 p-4'
        style={{
          height: 210,
        }}
      >
        <div className='position-absolute start-0 top-0 z-2 m-3'>
          <button
            type='button'
            onClick={handleRemoveClick}
            disabled={isRemoving}
            title='Bỏ khỏi yêu thích'
            className='d-flex align-items-center justify-content-center !rounded-circle border-0 bg-white text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-60'
            style={{
              width: 42,
              height: 42,
            }}
          >
            {isRemoving ? (
              <span
                className='spinner-border spinner-border-sm'
                role='status'
                aria-hidden='true'
              />
            ) : (
              <i className='bi bi-heart-fill fs-5' />
            )}
          </button>
        </div>

        <div className='position-absolute end-0 top-0 z-2 m-3'>
          <StockBadge stock={stock} />
        </div>

        {image ? (
          <Card.Img
            src={image}
            alt={product?.name}
            className='h-100 w-100 object-fit-contain'
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className='d-flex align-items-center justify-content-center !rounded-5 bg-white text-5xl shadow-sm'>
            💻
          </div>
        )}
      </div>

      <Card.Body className='d-flex flex-column p-4'>
        <div className='mb-3 d-flex flex-wrap gap-2'>
          <span className='!rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700'>
            {getBrandName(product)}
          </span>

          <span className='!rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'>
            {getCategoryName(product)}
          </span>
        </div>

        <h3 className='mb-2 text-xl font-black text-slate-950 line-clamp-2'>
          {product?.name || 'Sản phẩm'}
        </h3>

        <p className='mb-3 text-sm text-slate-500 line-clamp-2'>
          {product?.description ||
            variant?.variant_value ||
            'Sản phẩm công nghệ chính hãng.'}
        </p>

        {createdDate && (
          <p className='mb-3 text-xs font-bold text-slate-400'>
            Đã thích ngày {createdDate}
          </p>
        )}

        <div className='mt-auto'>
          <div className='d-flex align-items-end justify-content-between gap-2'>
            <div>
              <PriceText
                value={price}
                className='text-xl font-black text-orange-600'
              />

              {original > price && (
                <div className='text-xs text-slate-400 line-through'>
                  <PriceText value={original} />
                </div>
              )}
            </div>

            <span className='text-sm font-bold text-slate-500'>
              ⭐ {Number(product?.average_rating || 0).toFixed(1)}
            </span>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

function WishlistPage() {
  const navigate = useNavigate()
  const user = useMemo(() => getCurrentUser(), [])
  const currentUserId = getUserId(user)

  const [entries, setEntries] = useState([])
  const [stockFilter, setStockFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadWishlist = async () => {
    if (!currentUserId) {
      setIsLoading(false)
      setEntries([])
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setMessage('')

      const response = await getWishlist({
        user_id: currentUserId,
      })

      const wishlistItems = pickArray(response, [])

      const loadedEntries = await Promise.all(
        wishlistItems.map(async (item) => {
          const productId = getWishlistProductId(item)
          const fallbackProduct = getWishlistProduct(item)

          if (!productId) {
            return {
              item,
              product: fallbackProduct || null,
            }
          }

          try {
            const productResponse = await getProductById(productId)
            const productData = pickData(productResponse, {})
            const loadedProduct = productData?.product || productData
            const loadedVariants =
              productData?.variants || loadedProduct?.variants || []

            return {
              item,
              product: {
                ...loadedProduct,
                variants: loadedVariants,
              },
            }
          } catch {
            return {
              item,
              product: fallbackProduct || null,
            }
          }
        }),
      )

      setEntries(
        loadedEntries.filter((entry) => entry.product && getId(entry.product)),
      )
    } catch (error) {
      setEntries([])
      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Không tải được danh sách yêu thích.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWishlist()
  }, [])

  const brandOptions = useMemo(() => {
    return createUniqueFilterOptions(entries, getBrandInfo)
  }, [entries])

  const categoryOptions = useMemo(() => {
    return createUniqueFilterOptions(entries, getCategoryInfo)
  }, [entries])

  const visibleEntries = useMemo(() => {
    const filteredEntries = entries.filter((entry) => {
      const stock = getEntryStock(entry)
      const brandId = getEntryBrandId(entry)
      const categoryId = getEntryCategoryId(entry)

      if (stockFilter === 'in_stock' && stock <= 0) return false
      if (stockFilter === 'out_of_stock' && stock > 0) return false

      if (brandFilter !== 'all' && brandId !== brandFilter) return false
      if (categoryFilter !== 'all' && categoryId !== categoryFilter) return false

      return true
    })

    return [...filteredEntries].sort((a, b) => {
      if (sortBy === 'oldest') {
        return getEntryCreatedTime(a) - getEntryCreatedTime(b)
      }

      if (sortBy === 'price_asc') {
        return getEntryPrice(a) - getEntryPrice(b)
      }

      if (sortBy === 'price_desc') {
        return getEntryPrice(b) - getEntryPrice(a)
      }

      if (sortBy === 'name_asc') {
        return getEntryName(a).localeCompare(getEntryName(b))
      }

      if (sortBy === 'name_desc') {
        return getEntryName(b).localeCompare(getEntryName(a))
      }

      return getEntryCreatedTime(b) - getEntryCreatedTime(a)
    })
  }, [entries, stockFilter, brandFilter, categoryFilter, sortBy])

  const handleResetFilter = () => {
    setStockFilter('all')
    setBrandFilter('all')
    setCategoryFilter('all')
    setSortBy('newest')
  }

  const handleRemove = async (entry) => {
    const wishlistId = getId(entry.item)
    const productId = getId(entry.product) || getWishlistProductId(entry.item)
    const removeKey = wishlistId || productId

    try {
      setRemovingId(removeKey)
      setError('')
      setMessage('')

      if (wishlistId) {
        await removeWishlistById(wishlistId)
      } else {
        await removeWishlistByUserAndProduct(currentUserId, productId)
      }

      setEntries((prev) =>
        prev.filter((item) => {
          const itemWishlistId = getId(item.item)
          const itemProductId = getId(item.product)

          if (wishlistId) return itemWishlistId !== wishlistId

          return itemProductId !== productId
        }),
      )

      setMessage('Đã bỏ sản phẩm khỏi danh sách yêu thích.')
    } catch (error) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Không xóa được sản phẩm khỏi yêu thích.',
      )
    } finally {
      setRemovingId('')
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <div className='mb-4 d-flex flex-wrap align-items-end justify-content-between gap-3'>
            <div>
              <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                Wishlist
              </p>

              <h1 className='mb-2 text-4xl font-black text-slate-950'>
                Sản phẩm yêu thích
              </h1>

              <p className='mb-0 text-slate-500'>
                Bạn đang có {formatNumber(entries.length)} sản phẩm trong danh
                sách yêu thích.
              </p>
            </div>

            <Button className="!rounded-[10px]" variant='secondary' onClick={() => navigate('/products')}>
              Tiếp tục mua sắm
            </Button>
          </div>

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {!isLoading && currentUserId && entries.length > 0 && (
            <div className='mb-5 d-flex flex-column gap-4'>
              <div>

                <div className='d-flex flex-wrap align-items-center gap-2'>
                  {stockFilterOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={stockFilter === option.value}
                      icon={option.icon}
                      onClick={() => setStockFilter(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}

                  {brandOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={brandFilter === option.value}
                      icon='bi-award'
                      onClick={() => setBrandFilter(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}

                  {categoryOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={categoryFilter === option.value}
                      icon='bi-tags'
                      onClick={() => setCategoryFilter(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div>
                <h2 className='mb-3 text-2xl font-black text-slate-950'>
                  Sắp xếp theo
                </h2>

                <div className='d-flex flex-wrap gap-2'>
                  {sortOptions.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={sortBy === option.value}
                      icon={option.icon}
                      onClick={() => setSortBy(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <LoadingText>Đang tải danh sách yêu thích...</LoadingText>
          ) : !currentUserId ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để xem danh sách sản phẩm yêu thích.'
              actionLabel='Đăng nhập'
              onAction={() => navigate('/login')}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon='♡'
              title='Chưa có sản phẩm yêu thích'
              description='Hãy bấm biểu tượng trái tim ở trang chi tiết sản phẩm để lưu sản phẩm bạn thích.'
              actionLabel='Xem sản phẩm'
              onAction={() => navigate('/products')}
            />
          ) : visibleEntries.length === 0 ? (
            <EmptyState
              icon='🔎'
              title='Không có sản phẩm phù hợp'
              description='Thử đổi bộ lọc hoặc cách sắp xếp để xem thêm sản phẩm.'
              actionLabel='Xóa bộ lọc'
              onAction={handleResetFilter}
            />
          ) : (
            <Row className='g-4'>
              {visibleEntries.map((entry) => {
                const wishlistId = getId(entry.item)
                const productId = getId(entry.product)
                const removeKey = wishlistId || productId

                return (
                  <Col sm={6} lg={3} key={removeKey}>
                    <WishlistProductCard
                      entry={entry}
                      isRemoving={removingId === removeKey}
                      onRemove={handleRemove}
                    />
                  </Col>
                )
              })}
            </Row>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default WishlistPage
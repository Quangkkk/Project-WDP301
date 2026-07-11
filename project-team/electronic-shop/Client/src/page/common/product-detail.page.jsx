import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import { Link, useNavigate, useParams } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { addItemToCart } from '../../services/cart.service'
import { getErrorMessage } from '../../services/api'
import { getProductById } from '../../services/product.service'
import { getReviews } from '../../services/review.service'
import { getCurrentUser } from '../../utils/authStorage'
import { getCartIdentity } from '../../utils/sessionCart'
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

function formatReviewDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getSoldCount(product, variant) {
  const value =
    variant?.sold_quantity ??
    variant?.soldQuantity ??
    variant?.sold_count ??
    variant?.soldCount ??
    variant?.total_sold ??
    variant?.totalSold ??
    variant?.sold ??
    product?.sold_quantity ??
    product?.soldQuantity ??
    product?.sold_count ??
    product?.soldCount ??
    product?.total_sold ??
    product?.totalSold ??
    product?.total_ordered ??
    product?.totalOrdered ??
    product?.sales_count ??
    product?.salesCount ??
    product?.sold ??
    0

  return Number(value || 0)
}

function getVariantLabel(variant) {
  if (!variant) return 'Mặc định'

  const values = [
    variant.variant_value,
    variant.variant_name,
    variant.color,
    variant.storage,
    variant.ram,
  ].filter(Boolean)

  return values.length > 0 ? values.join(' - ') : 'Phiên bản mặc định'
}

function getCategoryInfo(product) {
  const category =
    product?.category ||
    product?.category_id ||
    product?.categoryId ||
    product?.categoryInfo

  if (category && typeof category === 'object') {
    return {
      id: getId(category),
      name: category.name || category.category_name || 'Danh mục',
    }
  }

  return {
    id: category || product?.category_id || product?.categoryId || '',
    name: product?.category_name || 'Danh mục',
  }
}

function getBrandInfo(product) {
  const brand =
    product?.brand ||
    product?.brand_id ||
    product?.brandId ||
    product?.brandInfo

  if (brand && typeof brand === 'object') {
    return {
      id: getId(brand),
      name: brand.name || brand.brand_name || '',
    }
  }

  return {
    id: brand || product?.brand_id || product?.brandId || '',
    name: product?.brand_name || '',
  }
}

function getReviewUser(review) {
  return review?.user_id || review?.user || {}
}

function getReviewUserName(review) {
  const user = getReviewUser(review)

  return (
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.email ||
    'Khách hàng'
  )
}

function getReviewAvatar(review) {
  const user = getReviewUser(review)
  return user?.img_url || user?.avatar || user?.avatar_url || ''
}

function getReviewInitial(review) {
  return String(getReviewUserName(review)).trim().charAt(0).toUpperCase() || 'U'
}

function getReviewComment(review) {
  return review?.comment || review?.reviews || review?.content || ''
}

function getReviewImages(review) {
  const images = review?.images

  if (!images) return []
  if (Array.isArray(images)) return images.filter(Boolean)
  if (typeof images === 'string') return [images]

  return []
}

function RatingStars({ rating = 0 }) {
  const value = Number(rating || 0)

  return (
    <div className='d-flex align-items-center gap-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= value ? 'text-amber-500' : 'text-slate-300'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function QuantityInput({ value, max, disabled, onChange }) {
  const safeMax = Number(max || 99)

  const updateValue = (nextValue) => {
    const numberValue = Number(nextValue)

    if (!Number.isFinite(numberValue) || numberValue < 1) {
      onChange(1)
      return
    }

    if (safeMax && numberValue > safeMax) {
      onChange(safeMax)
      return
    }

    onChange(numberValue)
  }

  const handleInputChange = (event) => {
    const rawValue = event.target.value.replace(/\D/g, '')

    if (!rawValue) {
      onChange(1)
      return
    }

    updateValue(rawValue)
  }

  return (
    <div className='d-inline-flex align-items-center overflow-hidden rounded-pill border border-slate-200 bg-white shadow-sm'>
      <button
        type='button'
        onClick={() => updateValue(Number(value) - 1)}
        disabled={disabled || value <= 1}
        className='d-flex align-items-center justify-content-center border-0 bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700'
        style={{
          width: 54,
          height: 44,
        }}
        aria-label='Giảm số lượng'
      >
        −
      </button>

      <input
        type='text'
        inputMode='numeric'
        pattern='[0-9]*'
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        className='border-0 bg-white p-0 text-center text-sm font-bold text-slate-900 shadow-none outline-none'
        style={{
          width: 64,
          height: 44,
          lineHeight: '44px',
        }}
      />

      <button
        type='button'
        onClick={() => updateValue(Number(value) + 1)}
        disabled={disabled || value >= safeMax}
        className='d-flex align-items-center justify-content-center border-0 bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700'
        style={{
          width: 54,
          height: 44,
        }}
        aria-label='Tăng số lượng'
      >
        +
      </button>
    </div>
  )
}

function ProductReviews({ reviews, isLoading, error }) {
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length
      : 0

  return (
    <div className='mt-5'>
      <Card className='overflow-hidden border-0 bg-white shadow-sm'>
        <Card.Body className='p-0'>
            

          <div className='p-4 p-lg-5'>
            <Alert type='warning'>{error}</Alert>

            {isLoading ? (
              <LoadingText />
            ) : reviews.length === 0 ? (
              <div className='rounded-4 border border-dashed border-slate-300 bg-slate-50 p-5 text-center'>
                <div className='mb-3 text-4xl'>💬</div>

                <h3 className='mb-2 text-xl font-black text-slate-900'>
                  Chưa có đánh giá
                </h3>

                <p className='mb-0 text-slate-500'>
                  Sản phẩm này hiện chưa có feedback từ khách hàng.
                </p>
              </div>
            ) : (
              <div className='d-flex flex-column gap-4'>
                {reviews.map((review, index) => {
                  const reviewImages = getReviewImages(review)
                  const avatar = getReviewAvatar(review)

                  return (
                    <div
                      key={getId(review) || `review-${index}`}
                      className='rounded-4 border border-slate-200 bg-white p-4 shadow-sm'
                    >
                      <div className='mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3'>
                        <div className='d-flex align-items-center gap-3'>
                          <span
                            className='d-flex align-items-center justify-content-center rounded-circle bg-orange-500 font-black text-white'
                            style={{
                              width: 48,
                              height: 48,
                              overflow: 'hidden',
                              minWidth: 48,
                            }}
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={getReviewUserName(review)}
                                className='h-100 w-100 object-cover'
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              getReviewInitial(review)
                            )}
                          </span>

                          <div>
                            <h3 className='mb-1 text-base font-black text-slate-950'>
                              {getReviewUserName(review)}
                            </h3>

                            <div className='d-flex flex-wrap align-items-center gap-2'>
                              <RatingStars rating={review.rating} />

                              <span className='text-sm font-bold text-slate-400'>
                                {formatReviewDate(review.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className='rounded-pill bg-amber-50 px-3 py-2 text-xs font-black text-amber-700'>
                          {Number(review.rating || 0).toFixed(1)} / 5
                        </span>
                      </div>

                      <p className='mb-0 leading-8 text-slate-600'>
                        {getReviewComment(review) || 'Khách hàng không để lại nội dung đánh giá.'}
                      </p>

                      {reviewImages.length > 0 && (
                        <div className='mt-3 d-flex flex-wrap gap-2'>
                          {reviewImages.map((item, imageIndex) => (
                            <a
                              key={`${item}-${imageIndex}`}
                              href={item}
                              target='_blank'
                              rel='noreferrer'
                              className='d-block overflow-hidden rounded-3 border border-slate-200 bg-slate-50'
                              style={{
                                width: 82,
                                height: 82,
                              }}
                            >
                              <img
                                src={item}
                                alt={`Review ${imageIndex + 1}`}
                                className='h-100 w-100 object-cover'
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none'
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reviews, setReviews] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isReviewLoading, setIsReviewLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const [error, setError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        setIsReviewLoading(true)
        setError('')
        setReviewError('')
        setMessage('')

        const response = await getProductById(id)

        if (!mounted) return

        const data = pickData(response)
        const loadedProduct = data?.product || data
        const loadedVariants = data?.variants || loadedProduct?.variants || []

        if (!loadedProduct || !getId(loadedProduct)) {
          setProduct(null)
          setVariants([])
          setVariantId('')
          setReviews([])
          setError('Không tìm thấy sản phẩm từ backend.')
          return
        }

        setProduct({
          ...loadedProduct,
          variants: loadedVariants,
        })

        setVariants(loadedVariants)
        setVariantId(getId(loadedVariants[0]) || '')
        setQuantity(1)

        try {
          const reviewResponse = await getReviews({
            product_id: getId(loadedProduct),
            status: 'visible',
          })

          if (!mounted) return

          setReviews(pickArray(reviewResponse, []))
        } catch (error) {
          if (!mounted) return

          setReviews([])
          setReviewError(getErrorMessage(error, 'Không tải được đánh giá sản phẩm.'))
        }
      } catch (error) {
        if (!mounted) return

        setProduct(null)
        setVariants([])
        setVariantId('')
        setReviews([])
        setError(getErrorMessage(error, 'Không tải được chi tiết sản phẩm từ backend.'))
      } finally {
        if (mounted) {
          setIsLoading(false)
          setIsReviewLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [id])

  const selectedVariant = useMemo(() => {
    return variants.find((item) => getId(item) === variantId) || variants[0] || null
  }, [variants, variantId])

  const categoryInfo = useMemo(() => getCategoryInfo(product), [product])
  const brandInfo = useMemo(() => getBrandInfo(product), [product])
  const brandName = brandInfo.name

  const price = getProductPrice(product, selectedVariant)
  const original = getProductOriginalPrice(product, selectedVariant)
  const image = getProductImage(product, selectedVariant)
  const stock = getStock(product, selectedVariant)
  const soldCount = getSoldCount(product, selectedVariant)
  const isOutOfStock = Number(stock || 0) <= 0

  const handleSelectVariant = (nextVariantId) => {
    setVariantId(nextVariantId)
    setQuantity(1)
    setMessage('')
    setError('')
  }

  const addSelectedItemToCart = async () => {
    const user = getCurrentUser()
    const identity = getCartIdentity(user)

    await addItemToCart({
      ...identity,
      product_id: getId(product),
      variant_id: getId(selectedVariant) || null,
      quantity,
    })
  }

  const handleAddToCart = async () => {
    try {
      setIsAdding(true)
      setMessage('')
      setError('')

      await addSelectedItemToCart()

      setMessage('Đã thêm sản phẩm vào giỏ hàng.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không thêm được sản phẩm vào giỏ hàng.'))
    } finally {
      setIsAdding(false)
    }
  }

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true)
      setMessage('')
      setError('')

      await addSelectedItemToCart()

      navigate('/checkout')
    } catch (error) {
      setError(getErrorMessage(error, 'Không thể chuyển sang trang thanh toán.'))
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <section className='page-section'>
          <Container>
            <LoadingText />
          </Container>
        </section>
      </MainLayout>
    )
  }

  if (!product) {
    return (
      <MainLayout>
        <section className='page-section'>
          <Container>
            <Alert type='danger'>{error}</Alert>

            <EmptyState
              title='Không tìm thấy sản phẩm'
              description='Sản phẩm này không tồn tại trong database hoặc backend chưa chạy.'
              actionLabel='Quay lại danh sách sản phẩm'
              onAction={() => navigate('/products')}
            />
          </Container>
        </section>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <nav className='mb-4 d-flex flex-wrap align-items-center gap-2 text-sm font-bold'>
            <Link to='/products' className='text-orange-600'>
              Danh mục
            </Link>

            <span className='text-slate-400'>/</span>

            {categoryInfo.id ? (
              <Link
                to={`/products?categoryId=${categoryInfo.id}`}
                className='text-orange-600'
              >
                {categoryInfo.name}
              </Link>
            ) : (
              <span className='text-orange-600'>{categoryInfo.name}</span>
            )}

            {brandName && (
              <>
                <span className='text-slate-400'>/</span>

                {brandInfo.id ? (
                  <Link
                    to={`/products?brandId=${brandInfo.id}`}
                    className='text-orange-600'
                  >
                    {brandName}
                  </Link>
                ) : (
                  <span className='text-orange-600'>{brandName}</span>
                )}
              </>
            )}

            <span className='text-slate-400'>/</span>

            <span className='text-slate-500'>{product.name}</span>
          </nav>

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          <Row className='g-5 align-items-start'>
            <Col lg={6}>
              <Card className='card-surface overflow-hidden'>
                <div className='flex min-h-[420px] items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5'>
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className='max-h-[360px] w-full object-contain'
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className='text-8xl'>💻</div>
                  )}
                </div>
              </Card>
            </Col>

            <Col lg={6}>
              <div className='mb-4'>
                <h1 className='mb-0 text-4xl font-black text-slate-950'>
                  {product.name}
                </h1>
              </div>

              <div className='mb-4 d-flex flex-wrap align-items-center gap-2'>
                <span className='rounded-pill bg-amber-50 px-3 py-2 text-xs font-black text-amber-700'>
                  ⭐ {Number(product.average_rating || 0).toFixed(1)}
                </span>

                <span className='rounded-pill bg-slate-100 px-3 py-2 text-xs font-black text-slate-700'>
                  Đã bán {formatNumber(soldCount)}
                </span>
              </div>

              <div className='mb-4'>
                <PriceText
                  value={price}
                  className='text-4xl font-black text-orange-600'
                />

                {original > price && (
                  <div className='text-slate-400 line-through'>
                    <PriceText value={original} />
                  </div>
                )}
              </div>

              {variants.length > 0 && (
                <div className='mb-4'>
                  <p className='mb-3 font-bold text-slate-700'>Phiên bản</p>

                  <div className='d-flex flex-wrap gap-3'>
                    {variants.map((variant) => {
                      const currentVariantId = getId(variant)
                      const isSelected = currentVariantId === variantId
                      const variantStock = getStock(product, variant)

                      return (
                        <button
                          type='button'
                          key={currentVariantId}
                          onClick={() => handleSelectVariant(currentVariantId)}
                          className={`rounded-4 border px-4 py-3 text-start transition ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50'
                          }`}
                          style={{ minWidth: 150 }}
                        >
                          <div className='font-bold'>
                            {getVariantLabel(variant)}
                          </div>

                          <div className='mt-1 text-xs text-slate-500'>
                            {variantStock > 0
                              ? `Còn ${formatNumber(variantStock)} sản phẩm`
                              : 'Hết hàng'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className='mb-4'>
                <p className='mb-3 font-bold text-slate-700'>Số lượng</p>

                <div className='d-flex flex-wrap align-items-center gap-3'>
                  <QuantityInput
                    value={quantity}
                    max={stock || 99}
                    disabled={isOutOfStock}
                    onChange={setQuantity}
                  />

                  {isOutOfStock ? (
                    <span className='text-sm font-bold text-red-500'>
                      Sản phẩm đã hết hàng
                    </span>
                  ) : (
                    <span className='text-sm font-bold text-slate-500'>
                      Còn {formatNumber(stock)} sản phẩm
                    </span>
                  )}
                </div>
              </div>

              <div className='d-flex flex-wrap gap-3'>
                <Button
                  isLoading={isAdding}
                  disabled={isOutOfStock || isCheckingOut}
                  onClick={handleAddToCart}
                >
                  Thêm vào giỏ hàng
                </Button>

                <Button
                  variant='secondary'
                  isLoading={isCheckingOut}
                  disabled={isOutOfStock || isAdding}
                  onClick={handleCheckout}
                >
                  Thanh toán
                </Button>
              </div>
            </Col>
          </Row>

          <div className='mt-5'>
            <Card className='overflow-hidden border-0 bg-white shadow-sm'>
              <Card.Body className='p-0'>
                <div className='border-bottom bg-orange-50 px-4 py-4'>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                    Thông tin sản phẩm
                  </p>

                  <h2 className='mb-0 text-3xl font-black text-slate-950'>
                    Mô tả & thông số
                  </h2>
                </div>

                <div className='p-4 p-lg-5'>
                  <Row className='g-4'>
                    <Col lg={7}>
                      <div className='h-100 rounded-4 border border-orange-100 bg-orange-50/40 p-4'>
                        <h3 className='mb-3 text-xl font-black text-slate-900'>
                          Mô tả sản phẩm
                        </h3>

                        <p className='mb-0 text-base leading-8 text-slate-600'>
                          {product.description ||
                            'Sản phẩm công nghệ chính hãng, phù hợp cho nhu cầu học tập, làm việc và giải trí hằng ngày.'}
                        </p>
                      </div>
                    </Col>

                    <Col lg={5}>
                      <div className='h-100 rounded-4 border border-slate-200 bg-white p-4'>
                        <h3 className='mb-4 text-xl font-black text-slate-900'>
                          Thông tin nhanh
                        </h3>

                        <div className='d-flex flex-column gap-3'>
                          <div className='d-flex align-items-center justify-content-between gap-3 rounded-3 bg-slate-50 px-3 py-3'>
                            <span className='d-flex align-items-center gap-2 font-bold text-slate-500'>
                              <i className='bi bi-grid-3x3-gap-fill text-orange-500' />
                              Danh mục
                            </span>

                            <span className='text-end font-black text-slate-900'>
                              {categoryInfo.name}
                            </span>
                          </div>

                          {brandName && (
                            <div className='d-flex align-items-center justify-content-between gap-3 rounded-3 bg-slate-50 px-3 py-3'>
                              <span className='d-flex align-items-center gap-2 font-bold text-slate-500'>
                                <i className='bi bi-award-fill text-orange-500' />
                                Thương hiệu
                              </span>

                              <span className='text-end font-black text-slate-900'>
                                {brandName}
                              </span>
                            </div>
                          )}

                          <div className='d-flex align-items-center justify-content-between gap-3 rounded-3 bg-slate-50 px-3 py-3'>
                            <span className='d-flex align-items-center gap-2 font-bold text-slate-500'>
                              <i className='bi bi-bag-check-fill text-orange-500' />
                              Đã bán
                            </span>

                            <span className='text-end font-black text-slate-900'>
                              {formatNumber(soldCount)} sản phẩm
                            </span>
                          </div>

                          <div className='d-flex align-items-center justify-content-between gap-3 rounded-3 bg-slate-50 px-3 py-3'>
                            <span className='d-flex align-items-center gap-2 font-bold text-slate-500'>
                              <i className='bi bi-chat-dots-fill text-orange-500' />
                              Feedback
                            </span>

                            <span className='text-end font-black text-slate-900'>
                              {formatNumber(reviews.length)} đánh giá
                            </span>
                          </div>

                          <div className='d-flex align-items-center justify-content-between gap-3 rounded-3 bg-slate-50 px-3 py-3'>
                            <span className='d-flex align-items-center gap-2 font-bold text-slate-500'>
                              <i className='bi bi-box-seam-fill text-orange-500' />
                              Kho hàng
                            </span>

                            <span
                              className={`text-end font-black ${
                                isOutOfStock ? 'text-red-500' : 'text-emerald-600'
                              }`}
                            >
                              {isOutOfStock
                                ? 'Hết hàng'
                                : `Còn ${formatNumber(stock)} sản phẩm`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </div>

          <ProductReviews
            reviews={reviews}
            isLoading={isReviewLoading}
            error={reviewError}
          />
        </Container>
      </section>
    </MainLayout>
  )
}

export default ProductDetailPage
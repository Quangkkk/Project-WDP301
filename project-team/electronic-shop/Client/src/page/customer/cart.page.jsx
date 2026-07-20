import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { useNavigate } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'
import CartItemRow from '../../components/molecules/CartItemRow'

import { getErrorMessage } from '../../services/api'
import { deleteCartItem, getCart, updateCartItem } from '../../services/cart.service'
import { getCurrentUser } from '../../utils/authStorage'
import { getCartIdentity } from '../../utils/sessionCart'

const CHECKOUT_SELECTED_ITEMS_KEY = 'electronic_shop_checkout_items'

function getCartItemId(item) {
  return item?._id || item?.id || ''
}

function getCartItemTotal(item) {
  return Number(item?.price || 0) * Number(item?.quantity || 0)
}

function CartPage() {
  const navigate = useNavigate()

  const [cart, setCart] = useState(null)
  const [items, setItems] = useState([])
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const identity = useMemo(() => getCartIdentity(getCurrentUser()), [])

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedItemIds.includes(getCartItemId(item)))
  }, [items, selectedItemIds])

  const selectedTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + getCartItemTotal(item), 0)
  }, [selectedItems])

  const isAllSelected = items.length > 0 && selectedItemIds.length === items.length
  const hasSelectedItems = selectedItemIds.length > 0

  const loadCart = async () => {
    try {
      setIsLoading(true)
      setError('')
      setMessage('')

      const response = await getCart(identity)
      const data = response?.data || {}
      const nextItems = data.items || []

      setCart(data.cart || null)
      setItems(nextItems)

      setSelectedItemIds((prev) => {
        const availableIds = nextItems.map(getCartItemId).filter(Boolean)

        if (prev.length === 0) {
          return availableIds
        }

        const keptIds = prev.filter((id) => availableIds.includes(id))
        return keptIds.length > 0 ? keptIds : availableIds
      })
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được giỏ hàng'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCart()
  }, [])

  const handleToggleItem = (itemId) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      }

      return [...prev, itemId]
    })

    setMessage('')
    setError('')
  }

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([])
      return
    }

    setSelectedItemIds(items.map(getCartItemId).filter(Boolean))
  }

  const handleQuantityChange = async (itemId, quantity) => {
    try {
      setError('')
      setMessage('')

      await updateCartItem(itemId, { quantity })

      setItems((prev) =>
        prev.map((item) =>
          getCartItemId(item) === itemId
            ? {
                ...item,
                quantity,
              }
            : item,
        ),
      )

      setMessage('Đã cập nhật giỏ hàng.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được số lượng'))
    }
  }

  const handleRemove = async (itemId) => {
    try {
      setError('')
      setMessage('')

      await deleteCartItem(itemId)

      setItems((prev) => prev.filter((item) => getCartItemId(item) !== itemId))
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId))

      setMessage('Đã xóa sản phẩm khỏi giỏ hàng.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không xóa được sản phẩm'))
    }
  }

  const handleCheckout = () => {
    if (!hasSelectedItems) {
      setError('Vui lòng chọn ít nhất một sản phẩm để thanh toán.')
      return
    }

    // Luu danh sach items duoc chon thanh toan vao sessionStorage de Checkout page lay duoc du lieu
    sessionStorage.setItem(
      CHECKOUT_SELECTED_ITEMS_KEY,
      JSON.stringify({
        selectedItemIds,
      }),
    )

    // Chuyen huong qua trang Checkout kem theo state luu tru item IDs
    navigate('/checkout', {
      state: {
        selectedItemIds,
      },
    })
  }

  return (
    <MainLayout>
      <section className='page-section pb-32'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : items.length === 0 ? (
            <EmptyState
              icon='🛒'
              title='Giỏ hàng đang trống'
              description='Hãy thêm sản phẩm vào giỏ hàng trước khi thanh toán.'
              actionLabel='Mua hàng'
              onAction={() => window.location.assign('/products')}
            />
          ) : (
            <>
              <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 !rounded-4 border border-orange-100 bg-white px-4 py-3 shadow-sm'>
                <label className='d-flex align-items-center gap-3 font-bold text-slate-700'>
                  <input
                    type='checkbox'
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                    className='form-check-input m-0'
                    style={{
                      width: 20,
                      height: 20,
                    }}
                  />

                  <span>Chọn tất cả</span>
                </label>

                <span className='rounded-pill bg-orange-50 px-3 py-2 text-sm font-black text-orange-700'>
                  Đã chọn {selectedItemIds.length}/{items.length} sản phẩm
                </span>
              </div>

              <Row className='g-4'>
                <Col lg={12}>
                  <div className='d-flex flex-column gap-3'>
                    {items.map((item) => {
                      const itemId = getCartItemId(item)

                      return (
                        <CartItemRow
                          key={itemId}
                          item={item}
                          selected={selectedItemIds.includes(itemId)}
                          onToggleSelect={() => handleToggleItem(itemId)}
                          onQuantityChange={handleQuantityChange}
                          onRemove={handleRemove}
                        />
                      )
                    })}
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </section>

      {!isLoading && items.length > 0 && (
        <div
          className='fixed-bottom pb-4'
          style={{
            pointerEvents: 'none',
            zIndex: 1030,
          }}
        >
          <Container>
            <Row className='justify-content-center'>
              <Col xs={11} md={10} lg={8}>
                <div
                  className='!rounded-5 border border-orange-100 bg-white px-4 py-3 shadow-lg'
                  style={{
                    pointerEvents: 'auto',
                  }}
                >
                  <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                    <div className='d-flex flex-wrap align-items-center gap-3'>
                      <label className='d-flex align-items-center gap-3 font-bold text-slate-700'>
                        <input
                          type='checkbox'
                          checked={isAllSelected}
                          onChange={handleToggleAll}
                          className='form-check-input m-0'
                          style={{
                            width: 20,
                            height: 20,
                          }}
                        />

                        <span>Chọn tất cả</span>
                      </label>

                      <span className='text-sm font-bold text-slate-500'>
                        Đã chọn {selectedItemIds.length} sản phẩm
                      </span>
                    </div>

                    <div className='d-flex flex-wrap align-items-center gap-4'>
                      <div className='text-end'>
                        <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                          Tổng thanh toán
                        </p>

                        <PriceText
                          value={selectedTotal}
                          className='text-2xl font-black text-orange-600'
                        />
                      </div>

                      <Button
                        type='button'
                        disabled={!hasSelectedItems}
                        onClick={handleCheckout}
                        className='px-5 py-3'
                      >
                        Thanh toán
                      </Button>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}
    </MainLayout>
  )
}

export default CartPage
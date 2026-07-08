import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import { Link } from 'react-router-dom'
import MainLayout from '../../components/templates/MainLayout'
import PageHeader from '../../components/templates/PageHeader'
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

function CartPage() {
  const [cart, setCart] = useState(null)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const identity = useMemo(() => getCartIdentity(getCurrentUser()), [])
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items])

  const loadCart = async () => {
    try {
      setIsLoading(true)
      const response = await getCart(identity)
      const data = response?.data || {}
      setCart(data.cart || null)
      setItems(data.items || [])
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được giỏ hàng'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadCart() }, [])

  const handleQuantityChange = async (itemId, quantity) => {
    try {
      await updateCartItem(itemId, { quantity })
      setItems((prev) => prev.map((item) => (item._id === itemId || item.id === itemId ? { ...item, quantity } : item)))
      setMessage('Đã cập nhật giỏ hàng.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được số lượng'))
    }
  }

  const handleRemove = async (itemId) => {
    try {
      await deleteCartItem(itemId)
      setItems((prev) => prev.filter((item) => item._id !== itemId && item.id !== itemId))
      setMessage('Đã xóa sản phẩm khỏi giỏ hàng.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không xóa được sản phẩm'))
    }
  }

  return (
    <MainLayout>
      <PageHeader eyebrow='Shopping cart' title='Your Cart' description='Kiểm tra sản phẩm, cập nhật số lượng và chuyển sang checkout.' />
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>
          {isLoading ? <LoadingText /> : items.length === 0 ? (
            <EmptyState icon='🛒' title='Giỏ hàng đang trống' description='Hãy thêm sản phẩm vào giỏ hàng trước khi checkout.' actionLabel='Shop products' onAction={() => window.location.assign('/products')} />
          ) : (
            <Row className='g-4'>
              <Col lg={8}>{items.map((item) => <CartItemRow key={item._id || item.id} item={item} onQuantityChange={handleQuantityChange} onRemove={handleRemove} />)}</Col>
              <Col lg={4}>
                <Card className='card-surface sticky-top' style={{ top: 96 }}>
                  <Card.Body className='p-4'>
                    <h3 className='mb-4 text-2xl font-black text-slate-950'>Order Summary</h3>
                    <div className='d-flex justify-content-between mb-3'><span className='text-slate-500'>Items</span><span className='font-bold'>{items.length}</span></div>
                    <div className='d-flex justify-content-between mb-4'><span className='text-slate-500'>Subtotal</span><PriceText value={total} className='font-black text-slate-950' /></div>
                    <Link to='/checkout' state={{ cartId: cart?._id || cart?.id }}><Button className='w-100 py-3'>Checkout</Button></Link>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default CartPage

import { useEffect, useState } from 'react'
import Container from 'react-bootstrap/Container'
import MainLayout from '../../components/templates/MainLayout'
import PageHeader from '../../components/templates/PageHeader'
import Alert from '../../components/atoms/Alert'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import OrderCard from '../../components/molecules/OrderCard'
import { getErrorMessage } from '../../services/api'
import { cancelOrder, getMyOrders } from '../../services/order.service'
import { getCurrentUser } from '../../utils/authStorage'
import { pickArray } from '../../utils/format'

function OrderHistoryPage() {
  const user = getCurrentUser()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadOrders = async () => {
    if (!user) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const response = await getMyOrders()
      setOrders(pickArray(response?.data, []))
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được lịch sử đơn hàng'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  const handleCancel = async (orderId) => {
    try {
      await cancelOrder(orderId)
      setMessage('Đã hủy đơn hàng.')
      loadOrders()
    } catch (error) {
      setError(getErrorMessage(error, 'Không hủy được đơn hàng'))
    }
  }

  return (
    <MainLayout>
      <PageHeader eyebrow='Orders' title='Order History' description='Xem lịch sử mua hàng, trạng thái giao hàng và hủy đơn nếu còn hợp lệ.' />
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>
          {isLoading ? (
            <LoadingText />
          ) : !user ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để xem lịch sử đơn hàng.'
              actionLabel='Đăng nhập'
              onAction={() => window.location.assign('/login')}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              icon='📦'
              title='Chưa có đơn hàng'
              description='Đơn hàng sau khi checkout sẽ xuất hiện ở đây.'
            />
          ) : (
            orders.map((order) => (
              <OrderCard key={order._id || order.id} order={order} onCancel={handleCancel} />
            ))
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default OrderHistoryPage

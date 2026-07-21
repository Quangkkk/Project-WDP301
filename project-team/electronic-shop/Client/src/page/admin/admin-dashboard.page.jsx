import { useEffect, useMemo, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import DashboardLayout from '../../components/templates/DashboardLayout'
import StatCard from '../../components/molecules/StatCard'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'
import StatusBadge from '../../components/atoms/StatusBadge'
import { getOrders } from '../../services/order.service'
import { getProducts } from '../../services/product.service'
import { getTickets } from '../../services/support.service'
import { getUsers } from '../../services/user.service'
import { getCurrentUser, getUserRole } from '../../utils/authStorage'
import { formatOrderCode, pickArray } from '../../utils/format'


function AdminDashboardPage() {
  const currentRole = getUserRole(getCurrentUser())
  const isAdmin = currentRole === 'ADMIN'
  const [data, setData] = useState({ products: [], orders: [], users: [], tickets: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [products, orders, users, tickets] = await Promise.allSettled([
        getProducts(),
        getOrders(),
        isAdmin ? getUsers() : Promise.resolve([]),
        getTickets(),
      ])
      if (!mounted) return
      setData({
        products: products.status === 'fulfilled' ? pickArray(products.value, []) : [],
        orders: orders.status === 'fulfilled' ? pickArray(orders.value, []) : [],
        users: users.status === 'fulfilled' ? pickArray(users.value, []) : [],
        tickets: tickets.status === 'fulfilled' ? pickArray(tickets.value, []) : [],
      })
      setIsLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [isAdmin])

  const orders = pickArray(data.orders, [])

  const isSuccessfulOrder = (order) =>
    String(order?.status || '').toLowerCase() === 'completed' &&
    String(order?.payment_status || '').toLowerCase() === 'paid'


  // Chỉ tính số lượng đã bán từ đơn hoàn thành và đã thanh toán.
  const totalItemsSold = useMemo(() => {
    return orders.reduce((sum, order) => {
      if (!isSuccessfulOrder(order)) return sum
      const orderItems = order.items || []
      const itemsCount = orderItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)
      return sum + itemsCount
    }, 0)
  }, [orders])

  // 3. So don hang dang cho xu ly (pending, confirmed, processing)
  const pendingOrdersCount = useMemo(() => {
    return orders.filter((order) =>
      ['pending', 'confirmed', 'processing'].includes(String(order.status).toLowerCase())
    ).length
  }, [orders])


  return (
    <DashboardLayout title='Tổng quan hệ thống' description='Tổng quan nhanh về sản phẩm, đơn hàng, doanh thu và yêu cầu hỗ trợ.'>
      {isLoading ? (
        <LoadingText />
      ) : (
        <>
          <Row className='g-4 mb-4'>
            <Col md={6} xl={isAdmin ? 3 : 4}>
              <StatCard icon='💻' label='Sản phẩm' value={data.products.length} helper='Tổng sản phẩm trong danh mục' />
            </Col>
            <Col md={6} xl={isAdmin ? 3 : 4}>
              <StatCard icon='📦' label='Đơn chờ xử lý' value={pendingOrdersCount} helper='Cần được xử lý' />
            </Col>
            {isAdmin && (
              <Col md={6} xl={3}>
                <StatCard icon='👤' label='Người dùng' value={data.users.length} helper='Tài khoản đã đăng ký' />
              </Col>
            )}
            <Col md={6} xl={isAdmin ? 3 : 4}>
              <StatCard icon='🛍️' label='Sản phẩm đã bán' value={totalItemsSold} helper='Tổng số lượng đã bán' />
            </Col>
          </Row>


          <Card className='card-surface'><Card.Body className='p-4'>
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <div>
                <h3 className='mb-1 text-2xl font-black text-slate-950'>Đơn hàng mới nhận</h3>
                <p className='mb-0 text-slate-500'>Danh sách các giao dịch đặt hàng gần nhất.</p>
              </div>
            </div>
            <div className='d-flex flex-column gap-2'>
              {orders.slice(0, 5).map((order) => (
                <div key={order._id || order.id} className='d-flex justify-content-between align-items-center !rounded-4 bg-slate-50 p-3'>
                  <span className='font-bold text-slate-700'>
                    {formatOrderCode(order)} - {order.user_id?.name || order.receiver_name}
                  </span>
                  <div className='d-flex align-items-center gap-2'>
                    <PriceText value={order.total_amount} className='font-black' />
                    <StatusBadge value={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card.Body></Card>
        </>
      )}
    </DashboardLayout>
  )
}

export default AdminDashboardPage
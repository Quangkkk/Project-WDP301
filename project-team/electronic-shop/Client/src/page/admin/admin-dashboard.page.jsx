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
import { pickArray } from '../../utils/format'

function AdminDashboardPage() {
  const [data, setData] = useState({ products: [], orders: [], users: [], tickets: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [products, orders, users, tickets] = await Promise.allSettled([getProducts(), getOrders(), getUsers(), getTickets()])
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
    return () => { mounted = false }
  }, [])

  const revenue = useMemo(() => data.orders.reduce((sum, order) => String(order.status).toLowerCase() === 'cancelled' ? sum : sum + Number(order.total_amount || 0), 0), [data.orders])
  const activeOrders = data.orders.filter((order) => ['pending', 'confirmed', 'processing', 'shipping'].includes(String(order.status).toLowerCase()))
  const staffCount = data.users.filter((u) => String(u.role_id?.code || '').toLowerCase() === 'staff').length

  return (
    <DashboardLayout title='Dashboard Overview' description='Tổng quan nhanh về sản phẩm, đơn hàng, doanh thu và support ticket.'>
      {isLoading ? <LoadingText /> : <>
        <Row className='g-4 mb-4'>
          <Col md={6} xl={3}><StatCard icon='💻' label='Products' value={data.products.length} helper='Total catalog items' /></Col>
          <Col md={6} xl={3}><StatCard icon='📦' label='Active Orders' value={activeOrders.length} helper='Need processing' /></Col>
          <Col md={6} xl={3}><StatCard icon='👔' label='Staff' value={staffCount} helper='Active staff members' /></Col>
          <Col md={6} xl={3}><StatCard icon='🎧' label='Tickets' value={data.tickets.length} helper='Support requests' /></Col>
        </Row>
        <Card className='card-surface'><Card.Body className='p-4'>
          <div className='d-flex flex-column flex-md-row justify-content-between gap-3 mb-4'>
            <div><h3 className='mb-1 text-2xl font-black text-slate-950'>Monthly Report Preview</h3><p className='mb-0 text-slate-500'>FE dashboard tính nhanh theo order hiện có.</p></div>
            <PriceText value={revenue} className='text-3xl font-black text-blue-600' />
          </div>
          <div className='d-flex flex-column gap-2'>
            {data.orders.slice(0, 5).map((order) => <div key={order._id || order.id} className='d-flex justify-content-between align-items-center rounded-4 bg-slate-50 p-3'><span className='font-bold text-slate-700'>#{String(order._id || order.id).slice(-6).toUpperCase()} - {order.user_id?.name || order.receiver_name}</span><div className='d-flex align-items-center gap-2'><PriceText value={order.total_amount} className='font-black' /><StatusBadge value={order.status} /></div></div>)}
          </div>
        </Card.Body></Card>
      </>}
    </DashboardLayout>
  )
}

export default AdminDashboardPage

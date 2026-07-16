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

// Bieu do doanh thu bang SVG phu hop React 19 va an toan, khong loi peer dependencies
function SVGMonthlyChart({ data }) {
  const width = 500
  const height = 240
  const paddingLeft = 60
  const paddingRight = 30
  const paddingTop = 30
  const paddingBottom = 40

  const maxRevenue = useMemo(() => {
    const max = Math.max(...data.map((d) => d.revenue), 0)
    return max > 0 ? max * 1.15 : 10000000 // Du phong 15% de line khong cham noc
  }, [data])

  const points = useMemo(() => {
    return data.map((d, idx) => {
      const x = paddingLeft + (idx * (width - paddingLeft - paddingRight)) / (data.length - 1 || 1)
      const y = height - paddingBottom - (d.revenue / maxRevenue) * (height - paddingTop - paddingBottom)
      return { x, y, label: d.label, revenue: d.revenue }
    })
  }, [data, maxRevenue])

  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
  }, [points])

  const fillPath = useMemo(() => {
    if (points.length === 0) return ''
    return `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
  }, [points, linePath])

  return (
    <div className='w-100' style={{ minHeight: 240 }}>
      <svg width='100%' height={height} viewBox={`0 0 ${width} ${height}`} className='overflow-visible'>
        <defs>
          <linearGradient id='revenueGradient' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#3b82f6' stopOpacity='0.3' />
            <stop offset='100%' stopColor='#3b82f6' stopOpacity='0.0' />
          </linearGradient>
        </defs>

        {/* Luoi ngang va label truc Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * (height - paddingTop - paddingBottom)
          const value = maxRevenue * (1 - ratio)
          return (
            <g key={idx} className='opacity-30'>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke='#cbd5e1' strokeWidth={1} strokeDasharray='4 4' />
              <text x={5} y={y + 4} className='text-[10px] font-bold fill-slate-400'>
                {new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value)}
              </text>
            </g>
          )
        })}

        {/* Vung Area to mau gradient */}
        {fillPath && <path d={fillPath} fill='url(#revenueGradient)' />}

        {/* Duong bieu do Line Chart */}
        {linePath && <path d={linePath} fill='none' stroke='#3b82f6' strokeWidth={3} strokeLinecap='round' strokeLinejoin='round' />}

        {/* Cac nut diem tron va label thang (truc X) */}
        {points.map((p, idx) => (
          <g key={idx} className='group cursor-pointer'>
            <circle cx={p.x} cy={p.y} r={5} fill='#3b82f6' stroke='#ffffff' strokeWidth={2} className='transition-all duration-200 group-hover:r-7' />
            
            <text x={p.x} y={height - 12} textAnchor='middle' className='text-[10px] font-bold fill-slate-400'>
              {p.label}
            </text>

            <title>{`${p.label}: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.revenue)}`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

function AdminDashboardPage() {
  const [data, setData] = useState({ products: [], orders: [], users: [], tickets: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [products, orders, users, tickets] = await Promise.allSettled([
        getProducts(),
        getOrders(),
        getUsers(),
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
  }, [])

  const orders = pickArray(data.orders, [])

  // 1. Tinh tong doanh so thuc te (bo don hang da bi huy)
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => {
      return String(order.status).toLowerCase() === 'cancelled' ? sum : sum + Number(order.total_amount || 0)
    }, 0)
  }, [orders])

  // 2. Dem so san pham da ban duoc (tong so luong items trong cac don hang)
  const totalItemsSold = useMemo(() => {
    return orders.reduce((sum, order) => {
      if (String(order.status).toLowerCase() === 'cancelled') return sum
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

  // 4. Du lieu bieu do doanh thu 6 thang gan nhat
  const monthlyRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = []

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Tao 6 thang nguoc thoi gian ket thuc o thang hien tai
    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonth - i
      let targetYear = currentYear
      if (targetMonth < 0) {
        targetMonth += 12
        targetYear -= 1
      }
      result.push({
        label: `${months[targetMonth]} ${targetYear}`,
        year: targetYear,
        monthIdx: targetMonth,
        revenue: 0,
      })
    }

    // Cong don doanh thu cho tung don hang
    orders.forEach((order) => {
      if (String(order.status).toLowerCase() === 'cancelled') return
      const date = new Date(order.created_at || order.createdAt)
      const oMonth = date.getMonth()
      const oYear = date.getFullYear()

      const bucket = result.find((b) => b.monthIdx === oMonth && b.year === oYear)
      if (bucket) {
        bucket.revenue += Number(order.total_amount || 0)
      }
    })

    return result
  }, [orders])

  return (
    <DashboardLayout title='Dashboard Overview' description='Tổng quan nhanh về sản phẩm, đơn hàng, doanh thu và support ticket.'>
      {isLoading ? (
        <LoadingText />
      ) : (
        <>
          <Row className='g-4 mb-4'>
            <Col md={6} xl={3}>
              <StatCard icon='💻' label='Products' value={data.products.length} helper='Total catalog items' />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='📦' label='Pending Orders' value={pendingOrdersCount} helper='Need processing' />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='👤' label='Users' value={data.users.length} helper='Registered accounts' />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='🛍️' label='Items Sold' value={totalItemsSold} helper='Total units sold' />
            </Col>
          </Row>

          <Row className='g-4 mb-4'>
            <Col lg={8}>
              <Card className='card-surface border-0 shadow-sm h-100'>
                <Card.Body className='p-4'>
                  <div className='d-flex justify-content-between align-items-center mb-4'>
                    <div>
                      <h3 className='mb-1 text-xl font-black text-slate-950'>Doanh thu 6 tháng gần nhất</h3>
                      <p className='mb-0 text-sm text-slate-500'>Biểu đồ doanh số tích lũy thực tế của cửa hàng</p>
                    </div>
                  </div>
                  <SVGMonthlyChart data={monthlyRevenueData} />
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className='card-surface border-0 shadow-sm h-100'>
                <Card.Body className='p-4 d-flex flex-column justify-content-between'>
                  <div>
                    <h3 className='mb-1 text-xl font-black text-slate-950'>Tổng Doanh Thu</h3>
                    <p className='mb-3 text-sm text-slate-500'>Doanh số tổng hợp từ các đơn hàng thành công</p>
                    <PriceText value={totalRevenue} className='text-3xl font-black text-blue-600' />
                  </div>
                  
                  <div className='mt-4 pt-3 border-top border-slate-100'>
                    <h4 className='text-sm font-bold text-slate-500 mb-2'>Thống kê nhanh đơn hàng:</h4>
                    <ul className='list-unstyled mb-0 d-flex flex-column gap-2 text-sm'>
                      <li className='d-flex justify-content-between'>
                        <span className='text-slate-600'>Tổng số đơn đặt:</span>
                        <span className='font-black text-slate-900'>{orders.length}</span>
                      </li>
                      <li className='d-flex justify-content-between'>
                        <span className='text-slate-600'>Đơn hàng hoàn thành:</span>
                        <span className='font-black text-green-600'>
                          {orders.filter((o) => String(o.status).toLowerCase() === 'completed').length}
                        </span>
                      </li>
                      <li className='d-flex justify-content-between'>
                        <span className='text-slate-600'>Đơn hàng đã hủy:</span>
                        <span className='font-black text-red-600'>
                          {orders.filter((o) => String(o.status).toLowerCase() === 'cancelled').length}
                        </span>
                      </li>
                    </ul>
                  </div>
                </Card.Body>
              </Card>
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
                <div key={order._id || order.id} className='d-flex justify-content-between align-items-center rounded-4 bg-slate-50 p-3'>
                  <span className='font-bold text-slate-700'>
                    #{String(order._id || order.id).slice(-6).toUpperCase()} - {order.user_id?.name || order.receiver_name}
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

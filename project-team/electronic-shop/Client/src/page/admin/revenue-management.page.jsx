import { useEffect, useMemo, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'

import DashboardLayout from '../../components/templates/DashboardLayout'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { getOrders } from '../../services/order.service'
import { getProducts, getCategories, getBrands } from '../../services/product.service'
import { formatCurrency, formatDate, formatOrderCode, getId, pickArray } from '../../utils/format'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const VND = (v) => formatCurrency(v)

const compact = (v) =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(v)

const isCompleted = (o) =>
  String(o?.status || '').toLowerCase() === 'completed' &&
  String(o?.payment_status || '').toLowerCase() === 'paid'

const isCancelled = (o) => String(o?.status || '').toLowerCase() === 'cancelled'

const getPaymentLabel = (method) =>
  ({ cod: 'Tiền mặt / COD', bank_transfer: 'Chuyển khoản', zalopay: 'Ví ZaloPay', stripe: 'Thẻ tín dụng' }[method] || method || 'Khác')

// ─────────────────────────────────────────────────────────
// SVG: Line Chart doanh thu theo ngày trong tháng
// ─────────────────────────────────────────────────────────
function DailyLineChart({ data }) {
  const W = 640, H = 220, PL = 56, PR = 24, PT = 20, PB = 36
  const innerW = W - PL - PR
  const innerH = H - PT - PB

  const maxVal = useMemo(() => {
    const m = Math.max(...data.map((d) => d.revenue), 1)
    return m * 1.15
  }, [data])

  const pts = useMemo(() =>
    data.map((d, i) => ({
      x: PL + (i / Math.max(data.length - 1, 1)) * innerW,
      y: PT + innerH - (d.revenue / maxVal) * innerH,
      ...d,
    })),
  [data, maxVal])

  const linePath = pts.length < 2 ? '' : `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
  const fillPath = linePath ? `${linePath} L ${pts[pts.length - 1].x} ${PT + innerH} L ${pts[0].x} ${PT + innerH} Z` : ''

  // Hien thi toi da 10 label tren truc X
  const xStep = Math.max(1, Math.ceil(data.length / 10))

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width='100%' height={H} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 320 }}>
        <defs>
          <linearGradient id='lg-daily' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#3b82f6' stopOpacity='0.25' />
            <stop offset='100%' stopColor='#3b82f6' stopOpacity='0' />
          </linearGradient>
        </defs>

        {/* Grid ngang */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = PT + r * innerH
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke='#e2e8f0' strokeWidth={1} strokeDasharray='4 3' />
              <text x={PL - 4} y={y + 4} textAnchor='end' fontSize={9} fill='#94a3b8' fontWeight='600'>
                {compact(maxVal * (1 - r))}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {fillPath && <path d={fillPath} fill='url(#lg-daily)' />}

        {/* Line */}
        {linePath && (
          <path d={linePath} fill='none' stroke='#3b82f6' strokeWidth={2.5} strokeLinecap='round' strokeLinejoin='round' />
        )}

        {/* Dots & X labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill='#3b82f6' stroke='#fff' strokeWidth={2} />
            {i % xStep === 0 && (
              <text x={p.x} y={H - 6} textAnchor='middle' fontSize={9} fill='#94a3b8' fontWeight='600'>
                {p.label}
              </text>
            )}
            <title>{`Ngày ${p.label}: ${VND(p.revenue)}`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SVG: Doughnut Chart theo danh mục
// ─────────────────────────────────────────────────────────
const PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

function DoughnutChart({ slices }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (!total) return <p className='text-slate-400 text-sm text-center py-6'>Chưa có dữ liệu</p>

  const CX = 100, CY = 100, R = 75, r = 42

  let cumAngle = -Math.PI / 2
  const arcs = slices.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI
    const x1 = CX + R * Math.cos(cumAngle)
    const y1 = CY + R * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = CX + R * Math.cos(cumAngle)
    const y2 = CY + R * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return { d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${CX + r * Math.cos(cumAngle)} ${CY + r * Math.sin(cumAngle)} A ${r} ${r} 0 ${large} 0 ${CX + r * Math.cos(cumAngle - angle)} ${CY + r * Math.sin(cumAngle - angle)} Z`, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value, pct: ((d.value / total) * 100).toFixed(1) }
  })

  return (
    <div className='d-flex align-items-center gap-4 flex-wrap'>
      <svg width={200} height={200} viewBox='0 0 200 200' style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity={0.9}>
            <title>{`${a.label}: ${VND(a.value)} (${a.pct}%)`}</title>
          </path>
        ))}
        <text x={CX} y={CY - 6} textAnchor='middle' fontSize={11} fill='#475569' fontWeight='700'>Tổng</text>
        <text x={CX} y={CY + 10} textAnchor='middle' fontSize={10} fill='#3b82f6' fontWeight='800'>{compact(total)}</text>
      </svg>
      <div className='d-flex flex-column gap-2' style={{ flex: 1, minWidth: 120 }}>
        {arcs.map((a, i) => (
          <div key={i} className='d-flex align-items-center gap-2'>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{a.label}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SVG: Horizontal Bar Chart theo thương hiệu
// ─────────────────────────────────────────────────────────
function BrandBarChart({ data }) {
  if (!data.length) return <p className='text-slate-400 text-sm text-center py-6'>Chưa có dữ liệu</p>
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const rowH = 34, PL = 80, PR = 70

  return (
    <svg width='100%' height={data.length * rowH + 16} viewBox={`0 0 400 ${data.length * rowH + 16}`}>
      {data.map((d, i) => {
        const barW = ((d.value / maxVal) * (400 - PL - PR)) || 0
        const y = i * rowH + 10
        return (
          <g key={i}>
            <text x={PL - 6} y={y + 14} textAnchor='end' fontSize={11} fill='#475569' fontWeight='700'>{d.label}</text>
            <rect x={PL} y={y + 2} width={Math.max(barW, 2)} height={22} rx={4} fill={PALETTE[i % PALETTE.length]} opacity={0.85} />
            <text x={PL + barW + 6} y={y + 15} fontSize={10} fill='#64748b' fontWeight='700'>{compact(d.value)}</text>
            <title>{`${d.label}: ${VND(d.value)}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────
// SVG: Stacked Bar — Thanh toán theo phương thức
// ─────────────────────────────────────────────────────────
function PaymentPieBar({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <p className='text-slate-400 text-sm text-center py-6'>Chưa có dữ liệu</p>

  let cumX = 0
  const W = 340, H = 32
  const segments = data.map((d, i) => {
    const w = (d.value / total) * W
    const x = cumX
    cumX += w
    return { x, w, color: PALETTE[i % PALETTE.length], ...d }
  })

  return (
    <div className='d-flex flex-column gap-3'>
      <svg width='100%' height={H} viewBox={`0 0 ${W} ${H}`} style={{ borderRadius: 8, overflow: 'hidden' }}>
        {segments.map((s, i) => (
          <rect key={i} x={s.x} y={0} width={Math.max(s.w, 1)} height={H} fill={s.color}>
            <title>{`${s.label}: ${VND(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
          </rect>
        ))}
      </svg>
      <div className='d-flex flex-column gap-2'>
        {segments.map((s, i) => (
          <div key={i} className='d-flex justify-content-between align-items-center'>
            <div className='d-flex align-items-center gap-2'>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{VND(s.value)} ({((s.value / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, helper, trend, trendLabel, accent = '#3b82f6' }) {
  const isPositive = typeof trend === 'number' ? trend >= 0 : null
  return (
    <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
      <Card.Body className='p-4'>
        <div className='d-flex justify-content-between align-items-start mb-3'>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {icon}
          </div>
          {trend !== undefined && trend !== null && (
            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: isPositive ? '#dcfce7' : '#fee2e2', color: isPositive ? '#16a34a' : '#dc2626' }}>
              {isPositive ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className='mb-1 text-sm font-bold' style={{ color: '#94a3b8' }}>{label}</p>
        <h3 className='mb-1 font-black' style={{ fontSize: 22, color: '#0f172a' }}>{value}</h3>
        {helper && <p className='mb-0 text-sm' style={{ color: '#64748b' }}>{helper}</p>}
        {trendLabel && <p className='mb-0' style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{trendLabel}</p>}
      </Card.Body>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
function RevenueManagementPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1) // 1-12
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [searchText, setSearchText] = useState('')

  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      const [ordersRes, productsRes, categoriesRes, brandsRes] = await Promise.allSettled([
        getOrders(),
        getProducts(),
        getCategories(),
        getBrands(),
      ])
      if (!mounted) return
      setOrders(pickArray(ordersRes.value, []))
      setProducts(pickArray(productsRes.value, []))
      setCategories(pickArray(categoriesRes.value, []))
      setBrands(pickArray(brandsRes.value, []))
      setIsLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // ── Lọc đơn theo tháng/năm đã chọn ───────────────────
  const monthOrders = useMemo(() =>
    orders.filter((o) => {
      const d = new Date(o.created_at || o.createdAt)
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth
    }),
  [orders, selectedYear, selectedMonth])

  const prevMonthOrders = useMemo(() => {
    let pm = selectedMonth - 1, py = selectedYear
    if (pm < 1) { pm = 12; py -= 1 }
    return orders.filter((o) => {
      const d = new Date(o.created_at || o.createdAt)
      return d.getFullYear() === py && d.getMonth() + 1 === pm
    })
  }, [orders, selectedYear, selectedMonth])

  // ── KPI: Doanh thu gộp / thuần ────────────────────────
  const grossRevenue = useMemo(() =>
    monthOrders.filter(isCompleted).reduce((s, o) => s + Number(o.total_amount || 0), 0),
  [monthOrders])

  const cancelledAmount = useMemo(() =>
    monthOrders.filter(isCancelled).reduce((s, o) => s + Number(o.total_amount || 0), 0),
  [monthOrders])

  const discountAmount = useMemo(() =>
    monthOrders.filter(isCompleted).reduce((s, o) => s + Number(o.discount_amount || 0), 0),
  [monthOrders])

  const netRevenue = grossRevenue - discountAmount

  const prevGross = useMemo(() =>
    prevMonthOrders.filter(isCompleted).reduce((s, o) => s + Number(o.total_amount || 0), 0),
  [prevMonthOrders])

  const momGrowth = prevGross > 0 ? ((grossRevenue - prevGross) / prevGross) * 100 : null

  // YoY: cùng kỳ năm trước
  const yoyOrders = useMemo(() =>
    orders.filter((o) => {
      const d = new Date(o.created_at || o.createdAt)
      return d.getFullYear() === selectedYear - 1 && d.getMonth() + 1 === selectedMonth
    }),
  [orders, selectedYear, selectedMonth])

  const yoyGross = yoyOrders.filter(isCompleted).reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const yoyGrowth = yoyGross > 0 ? ((grossRevenue - yoyGross) / yoyGross) * 100 : null

  // AOV
  const completedCount = monthOrders.filter(isCompleted).length
  const aov = completedCount > 0 ? grossRevenue / completedCount : 0

  // Tỷ lệ hủy/hoàn
  const cancelRate = monthOrders.length > 0 ? (monthOrders.filter(isCancelled).length / monthOrders.length) * 100 : 0

  // ── Biểu đồ: Doanh thu theo ngày ─────────────────────
  const dailyChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const buckets = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), revenue: 0 }))
    monthOrders.filter(isCompleted).forEach((o) => {
      const day = new Date(o.created_at || o.createdAt).getDate()
      if (buckets[day - 1]) buckets[day - 1].revenue += Number(o.total_amount || 0)
    })
    return buckets
  }, [monthOrders, selectedYear, selectedMonth])

  // ── Biểu đồ: Doanh thu theo danh mục (Doughnut) ──────
  const categorySlices = useMemo(() => {
    const map = {}
    monthOrders.filter(isCompleted).forEach((o) => {
      ;(o.items || []).forEach((item) => {
        const prod = products.find((p) => getId(p) === (getId(item.product_id) || getId(item.product)))
        const catName = prod?.category_id?.name || prod?.category?.name || 'Khác'
        map[catName] = (map[catName] || 0) + Number(item.price || 0) * Number(item.quantity || 1)
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))
  }, [monthOrders, products])

  // ── Biểu đồ: Doanh thu theo thương hiệu (Bar) ────────
  const brandBars = useMemo(() => {
    const map = {}
    monthOrders.filter(isCompleted).forEach((o) => {
      ;(o.items || []).forEach((item) => {
        const prod = products.find((p) => getId(p) === (getId(item.product_id) || getId(item.product)))
        const bName = prod?.brand_id?.name || prod?.brand?.name || 'Khác'
        map[bName] = (map[bName] || 0) + Number(item.price || 0) * Number(item.quantity || 1)
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))
  }, [monthOrders, products])

  // ── Phân bổ phương thức thanh toán ────────────────────
  const paymentSlices = useMemo(() => {
    const map = {}
    monthOrders.filter(isCompleted).forEach((o) => {
      const key = getPaymentLabel(o.payment_method)
      map[key] = (map[key] || 0) + Number(o.total_amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [monthOrders])

  // ── Kênh bán hàng ─
  const channelData = useMemo(() => [
    { label: 'Online (Website)', value: monthOrders.filter(isCompleted).reduce((s, o) => s + Number(o.total_amount || 0), 0) },
  ], [monthOrders])

  // ── Top sản phẩm bán chạy ─────────────────────────────
  const topProducts = useMemo(() => {
    const map = {}
    monthOrders.filter(isCompleted).forEach((o) => {
      ;(o.items || []).forEach((item) => {
        const pid = getId(item.product_id) || getId(item.product)
        const prod = products.find((p) => getId(p) === pid)
        const name = prod?.name || item.name || pid || 'Sản phẩm'
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0, category: prod?.category_id?.name || prod?.category?.name || '—', brand: prod?.brand_id?.name || prod?.brand?.name || '—' }
        map[name].qty += Number(item.quantity || 1)
        map[name].revenue += Number(item.price || 0) * Number(item.quantity || 1)
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [monthOrders, products])

  // ── Bảng chi tiết đơn hàng (có filter) ───────────────
  const detailRows = useMemo(() => {
    return monthOrders
      .filter(isCompleted)
      .flatMap((o) =>
        (o.items || []).map((item) => {
          const pid = getId(item.product_id) || getId(item.product)
          const prod = products.find((p) => getId(p) === pid)
          const catName = prod?.category_id?.name || prod?.category?.name || '—'
          const brandName = prod?.brand_id?.name || prod?.brand?.name || '—'
          return {
            orderId: getId(o),
            orderCode: formatOrderCode(o),
            date: o.created_at || o.createdAt,
            name: prod?.name || item.name || 'Sản phẩm',
            category: catName,
            brand: brandName,
            qty: Number(item.quantity || 1),
            unitPrice: Number(item.price || 0),
            total: Number(item.price || 0) * Number(item.quantity || 1),
            discount: Number(o.discount_amount || 0),
            net: Number(item.price || 0) * Number(item.quantity || 1) - Number(o.discount_amount || 0) / Math.max((o.items || []).length, 1),
          }
        })
      )
      .filter((r) => {
        const matchCat = !filterCategory || r.category === filterCategory
        const matchBrand = !filterBrand || r.brand === filterBrand
        const matchSearch = !searchText || r.name.toLowerCase().includes(searchText.toLowerCase()) || r.orderCode.toLowerCase().includes(searchText.toLowerCase())
        return matchCat && matchBrand && matchSearch
      })
  }, [monthOrders, products, filterCategory, filterBrand, searchText])

  // ── Export CSV ────────────────────────────────────────
  const handleExportCSV = () => {
    const header = ['STT', 'Mã đơn', 'Ngày', 'Sản phẩm', 'Danh mục', 'Thương hiệu', 'Số lượng', 'Đơn giá', 'Tổng', 'Chiết khấu', 'Doanh thu thuần']
    const rows = detailRows.map((r, i) => [
      i + 1, r.orderCode, formatDate(r.date), `"${r.name}"`, r.category, r.brand, r.qty, r.unitPrice, r.total, r.discount.toFixed(0), r.net.toFixed(0),
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doanh-thu-T${selectedMonth}-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear()].map((y) => ({ value: y, label: String(y) }))
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
  const categoryOptions = [...new Set(detailRows.map((r) => r.category).filter(Boolean))]
  const brandOptions = [...new Set(detailRows.map((r) => r.brand).filter(Boolean))]

  return (
    <DashboardLayout
      title='Phân tích Doanh thu'
      description='Báo cáo doanh thu tháng theo KPI, biểu đồ và chi tiết đơn hàng dành cho Quản lý.'
    >
      {isLoading ? (
        <LoadingText />
      ) : (
        <>
          {/* ── Bộ lọc thời gian ── */}
          <div className='d-flex align-items-center gap-3 flex-wrap mb-4 p-3 bg-slate-50 rounded-3 border border-slate-200'>
            <span className='text-sm font-bold text-slate-500'>📅 Kỳ báo cáo:</span>
            <Form.Select
              size='sm'
              style={{ width: 130 }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Form.Select>
            <Form.Select
              size='sm'
              style={{ width: 100 }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Form.Select>
            <span className='ms-auto text-xs text-slate-400'>
              Tổng {monthOrders.length} đơn | {completedCount} hoàn thành | {monthOrders.filter(isCancelled).length} hủy
            </span>
          </div>

          {/* ── KPI Cards ── */}
          <Row className='g-3 mb-4'>
            <Col xs={6} xl={3}>
              <KpiCard
                icon='💰'
                label='Doanh thu gộp'
                value={VND(grossRevenue)}
                helper={`${completedCount} đơn hoàn thành`}
                trend={momGrowth}
                trendLabel={momGrowth !== null ? 'so với tháng trước (MoM)' : undefined}
                accent='#3b82f6'
              />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard
                icon='📈'
                label='Doanh thu thuần'
                value={VND(netRevenue)}
                helper={`Sau chiết khấu ${VND(discountAmount)}`}
                trend={yoyGrowth}
                trendLabel={yoyGrowth !== null ? 'so với cùng kỳ năm trước (YoY)' : undefined}
                accent='#10b981'
              />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard
                icon='🛒'
                label='AOV (Giá trị TB/đơn)'
                value={VND(aov)}
                helper='Average Order Value'
                accent='#f59e0b'
              />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard
                icon='🔄'
                label='Tỷ lệ hủy/hoàn'
                value={`${cancelRate.toFixed(1)}%`}
                helper={`${monthOrders.filter(isCancelled).length} đơn bị hủy | ~${VND(cancelledAmount)}`}
                accent='#ef4444'
              />
            </Col>
          </Row>

          {/* ── Line Chart + Doughnut ── */}
          <Row className='g-4 mb-4'>
            <Col lg={8}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>📊 Doanh thu theo ngày</h5>
                  <p className='text-sm text-slate-500 mb-3'>Xu hướng doanh thu từng ngày trong Tháng {selectedMonth}/{selectedYear}</p>
                  <DailyLineChart data={dailyChartData} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>🍩 Cơ cấu theo danh mục</h5>
                  <p className='text-sm text-slate-500 mb-3'>Nhóm ngành hàng gánh doanh thu chính</p>
                  <DoughnutChart slices={categorySlices} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ── Brand Bar + Payment ── */}
          <Row className='g-4 mb-4'>
            <Col lg={7}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>🏷️ Doanh thu theo thương hiệu</h5>
                  <p className='text-sm text-slate-500 mb-3'>Đánh giá sức hút của từng hãng để kế hoạch nhập hàng</p>
                  <BrandBarChart data={brandBars} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>💳 Phân bổ thanh toán</h5>
                  <p className='text-sm text-slate-500 mb-3'>Tiền mặt / Chuyển khoản / Ví điện tử / Thẻ</p>
                  <PaymentPieBar data={paymentSlices} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ── Kênh bán + Top sản phẩm ── */}
          <Row className='g-4 mb-4'>
            <Col lg={4}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>🏬 Hiệu quả kênh bán</h5>
                  <p className='text-sm text-slate-500 mb-3'>Doanh thu qua nền tảng trực tuyến</p>
                  <div className='d-flex flex-column gap-3 mt-3'>
                    {channelData.map((c, i) => {
                      const totalCh = channelData.reduce((s, d) => s + d.value, 0) || 1
                      const pct = ((c.value / totalCh) * 100).toFixed(1)
                      return (
                        <div key={i}>
                          <div className='d-flex justify-content-between mb-1'>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{c.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE[i] }}>{pct}%</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: PALETTE[i], borderRadius: 6, transition: 'width 0.6s ease' }} />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{VND(c.value)}</p>
                        </div>
                      )
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              <Card className='h-100 border-0 shadow-sm' style={{ borderRadius: 14 }}>
                <Card.Body className='p-4'>
                  <h5 className='font-black text-slate-900 mb-1'>🏆 Top sản phẩm bán chạy</h5>
                  <p className='text-sm text-slate-500 mb-3'>10 sản phẩm có doanh thu cao nhất trong tháng</p>
                  {topProducts.length === 0 ? (
                    <p className='text-slate-400 text-sm text-center py-4'>Chưa có dữ liệu</p>
                  ) : (
                    <Table responsive hover size='sm' className='mb-0 align-middle'>
                      <thead>
                        <tr style={{ fontSize: 12 }}>
                          <th className='text-slate-500 fw-bold border-0 pb-2'>#</th>
                          <th className='text-slate-500 fw-bold border-0 pb-2'>Sản phẩm</th>
                          <th className='text-slate-500 fw-bold border-0 pb-2'>Danh mục</th>
                          <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Đã bán</th>
                          <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={i} style={{ fontSize: 13 }}>
                            <td>
                              <span style={{ width: 22, height: 22, borderRadius: 6, background: i < 3 ? '#fef3c7' : '#f1f5f9', color: i < 3 ? '#d97706' : '#64748b', fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i + 1}
                              </span>
                            </td>
                            <td>
                              <span className='fw-bold text-slate-800'>{p.name}</span>
                              <br />
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.brand}</span>
                            </td>
                            <td><span style={{ fontSize: 11, background: '#eff6ff', color: '#3b82f6', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>{p.category}</span></td>
                            <td className='text-end fw-bold text-slate-700'>{p.qty.toLocaleString()}</td>
                            <td className='text-end fw-bold' style={{ color: '#16a34a' }}>{VND(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ── Bảng chi tiết + Filter + Export ── */}
          <Card className='border-0 shadow-sm' style={{ borderRadius: 14 }}>
            <Card.Body className='p-4'>
              <div className='d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4'>
                <div>
                  <h5 className='font-black text-slate-900 mb-1'>📋 Bảng chi tiết doanh thu</h5>
                  <p className='text-sm text-slate-500 mb-0'>Chi tiết từng sản phẩm trong các đơn hoàn thành — {detailRows.length} dòng</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className='d-flex align-items-center gap-2 px-4 py-2 fw-bold border-0 text-white'
                  style={{ background: '#16a34a', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
                >
                  ⬇️ Xuất CSV
                </button>
              </div>

              {/* Bộ lọc nâng cao */}
              <div className='d-flex gap-2 flex-wrap mb-3 p-3 bg-slate-50 rounded-3'>
                <Form.Control
                  size='sm'
                  placeholder='🔍 Tìm sản phẩm, mã đơn...'
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ maxWidth: 220 }}
                />
                <Form.Select
                  size='sm'
                  style={{ maxWidth: 160 }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value=''>Tất cả danh mục</option>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </Form.Select>
                <Form.Select
                  size='sm'
                  style={{ maxWidth: 160 }}
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                >
                  <option value=''>Tất cả thương hiệu</option>
                  {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </Form.Select>
                {(filterCategory || filterBrand || searchText) && (
                  <button
                    onClick={() => { setFilterCategory(''); setFilterBrand(''); setSearchText('') }}
                    style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕ Xóa lọc
                  </button>
                )}
              </div>

              {detailRows.length === 0 ? (
                <p className='text-slate-400 text-sm text-center py-6'>Không có dữ liệu phù hợp</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table hover responsive size='sm' className='mb-0 align-middle'>
                    <thead>
                      <tr style={{ fontSize: 12 }}>
                        <th className='text-slate-500 fw-bold border-0 pb-2'>STT</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2'>Mã đơn</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2'>Ngày</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2'>Sản phẩm</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2'>Danh mục</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>SL</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Đơn giá</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Tổng</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Chiết khấu</th>
                        <th className='text-slate-500 fw-bold border-0 pb-2 text-end'>Doanh thu thuần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.slice(0, 100).map((r, i) => (
                        <tr key={`${r.orderId}-${i}`} style={{ fontSize: 13 }}>
                          <td className='text-slate-400'>{i + 1}</td>
                          <td className='fw-bold text-blue-600'>{r.orderCode}</td>
                          <td className='text-slate-500'>{formatDate(r.date)}</td>
                          <td className='fw-bold text-slate-800' style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</td>
                          <td><span style={{ fontSize: 11, background: '#eff6ff', color: '#3b82f6', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>{r.category}</span></td>
                          <td className='text-end fw-bold text-slate-700'>{r.qty}</td>
                          <td className='text-end text-slate-600'>{VND(r.unitPrice)}</td>
                          <td className='text-end fw-bold text-slate-900'>{VND(r.total)}</td>
                          <td className='text-end text-red-500'>{r.discount > 0 ? `-${VND(r.discount / Math.max(detailRows.filter(x => x.orderId === r.orderId).length, 1))}` : '—'}</td>
                          <td className='text-end fw-bold' style={{ color: '#16a34a' }}>{VND(r.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontSize: 13, borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={7} className='fw-bold text-slate-600 pt-2'>Tổng cộng ({detailRows.length} dòng{detailRows.length > 100 ? ', hiển thị 100' : ''})</td>
                        <td className='text-end fw-bold text-slate-900 pt-2'>{VND(detailRows.reduce((s, r) => s + r.total, 0))}</td>
                        <td className='text-end text-red-500 pt-2'>-{VND(detailRows.reduce((s, r) => s + (r.discount / Math.max(detailRows.filter(x => x.orderId === r.orderId).length, 1)), 0))}</td>
                        <td className='text-end fw-bold pt-2' style={{ color: '#16a34a' }}>{VND(detailRows.reduce((s, r) => s + r.net, 0))}</td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </DashboardLayout>
  )
}

export default RevenueManagementPage

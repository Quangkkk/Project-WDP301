import { useEffect, useState, useMemo } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import * as XLSX from 'xlsx'
import DashboardLayout from '../../components/templates/DashboardLayout'
import StatCard from '../../components/molecules/StatCard'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'
import Button from '../../components/atoms/Button'
import SelectField from '../../components/atoms/SelectField'
import { getRevenueAnalytics } from '../../services/analytics.service'
import { getErrorMessage } from '../../services/api'
import Alert from '../../components/atoms/Alert'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

function RevenueAnalyticsPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('30days') // 30days, thisMonth, lastMonth

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setIsLoading(true)
        let startDate, endDate
        const today = new Date()

        if (dateRange === '30days') {
          startDate = subDays(today, 30)
          endDate = today
        } else if (dateRange === 'thisMonth') {
          startDate = startOfMonth(today)
          endDate = endOfMonth(today)
        } else if (dateRange === 'lastMonth') {
          const lastMonth = subDays(startOfMonth(today), 1)
          startDate = startOfMonth(lastMonth)
          endDate = endOfMonth(lastMonth)
        }

        const res = await getRevenueAnalytics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })

        if (!mounted) return
        if (res.success) {
          setData(res.data)
        } else {
          setError('Không thể tải dữ liệu doanh thu')
        }
      } catch (err) {
        if (!mounted) return
        setError(getErrorMessage(err, 'Lỗi kết nối máy chủ'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [dateRange])

  const handleExport = () => {
    if (!data?.detailedData) return
    const ws = XLSX.utils.json_to_sheet(data.detailedData.map((item, index) => ({
      'STT': index + 1,
      'Ngày': format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
      'Sản phẩm': item.product_name,
      'Danh mục': item.category,
      'Thương hiệu': item.brand,
      'Số lượng': item.quantity,
      'Đơn giá': item.unit_price,
      'Tổng tiền': item.total_revenue,
      'Trạng thái': item.order_status,
      'Thanh toán': item.payment_method
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DoanhThu')
    XLSX.writeFile(wb, `BaoCaoDoanhThu_${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  if (isLoading && !data) {
    return <DashboardLayout title='Báo cáo doanh thu' description='Báo cáo doanh thu chi tiết'><LoadingText /></DashboardLayout>
  }

  return (
    <DashboardLayout title='Báo cáo doanh thu' description='Phân tích doanh thu, tăng trưởng và xu hướng mua hàng'>
      {error && <Alert type='danger'>{error}</Alert>}
      
      <div className='mb-4 d-flex justify-content-between align-items-center bg-white p-3 rounded-4 shadow-sm'>
        <div className='d-flex align-items-center gap-3'>
          <span className='font-bold text-slate-700'>Thời gian:</span>
          <SelectField 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '30days', label: '30 Ngày qua' },
              { value: 'thisMonth', label: 'Tháng này' },
              { value: 'lastMonth', label: 'Tháng trước' }
            ]}
          />
        </div>
        <Button onClick={handleExport} icon='📥' variant='secondary'>Xuất Excel</Button>
      </div>

      {isLoading && <div className='mb-3'><LoadingText /></div>}

      {data && (
        <>
          {/* Key Metrics */}
          <Row className='g-4 mb-4'>
            <Col md={6} xl={3}>
              <StatCard icon='💰' label='Doanh thu thuần' value={<PriceText value={data.metrics.netRevenue} />} helper='Thực thu sau chiết khấu' />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='📈' label='Doanh thu gộp' value={<PriceText value={data.metrics.grossRevenue} />} helper='Chưa trừ chi phí' />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='🛍️' label='Tổng số đơn hàng' value={data.metrics.totalOrders} helper={`${data.metrics.completedOrders} đơn hoàn thành`} />
            </Col>
            <Col md={6} xl={3}>
              <StatCard icon='💵' label='GTĐH trung bình' value={<PriceText value={data.metrics.aov} />} helper='Bình quân 1 đơn hàng' />
            </Col>
          </Row>

          <Row className='g-4 mb-4'>
            {/* Daily Trend Line Chart */}
            <Col lg={8}>
              <Card className='card-surface h-100'>
                <Card.Body className='p-4'>
                  <h3 className='text-lg font-bold mb-4'>Xu hướng doanh thu</h3>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={data.dailyRevenue}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='_id' tickFormatter={(tick) => format(new Date(tick), 'dd/MM')} />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                        <Legend />
                        <Line type='monotone' dataKey='revenue' name='Doanh thu (VNĐ)' stroke='#0088FE' strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Category Pie Chart */}
            <Col lg={4}>
              <Card className='card-surface h-100'>
                <Card.Body className='p-4'>
                  <h3 className='text-lg font-bold mb-4'>Cơ cấu Danh mục</h3>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={data.categoryRevenue}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey='revenue'
                          nameKey='name'
                        >
                          {data.categoryRevenue.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className='g-4 mb-4'>
            {/* Brands Bar Chart */}
            <Col lg={6}>
              <Card className='card-surface h-100'>
                <Card.Body className='p-4'>
                  <h3 className='text-lg font-bold mb-4'>Doanh thu theo Thương hiệu</h3>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={data.brandRevenue} layout='vertical' margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray='3 3' horizontal={false} />
                        <XAxis type='number' tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <YAxis dataKey='name' type='category' />
                        <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                        <Bar dataKey='revenue' name='Doanh thu' fill='#00C49F' radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {/* Payment Methods */}
            <Col lg={6}>
              <Card className='card-surface h-100'>
                <Card.Body className='p-4'>
                  <h3 className='text-lg font-bold mb-4'>Phương thức thanh toán</h3>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={data.paymentMethods}
                          cx='50%'
                          cy='50%'
                          outerRadius={100}
                          dataKey='revenue'
                          nameKey='_id'
                          label={(entry) => entry._id.toUpperCase()}
                        >
                          {data.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Best Sellers */}
          <Card className='card-surface mb-4'>
            <Card.Body className='p-4'>
              <h3 className='text-lg font-bold mb-4'>Top 10 Sản phẩm bán chạy</h3>
              <Table responsive hover className='mb-0'>
                <thead>
                  <tr className='bg-slate-50'>
                    <th className='p-3'>Sản phẩm</th>
                    <th>SKU</th>
                    <th className='text-center'>Số lượng bán (Volume)</th>
                    <th className='text-end p-3'>Tổng doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bestSellers.map((item, index) => (
                    <tr key={item._id}>
                      <td className='p-3'>
                        <div className='d-flex align-items-center gap-3'>
                          <span className='font-bold text-slate-400'>#{index + 1}</span>
                          {item.image && <img src={item.image} alt={item.name} className='rounded' style={{ width: 40, height: 40, objectFit: 'cover' }} />}
                          <span className='font-bold text-slate-800'>{item.name}</span>
                        </div>
                      </td>
                      <td className='align-middle text-slate-600'>{item.sku || '--'}</td>
                      <td className='align-middle text-center font-bold text-blue-600'>{item.totalVolume}</td>
                      <td className='align-middle text-end p-3'><PriceText value={item.totalRevenue} className='font-black' /></td>
                    </tr>
                  ))}
                  {data.bestSellers.length === 0 && (
                    <tr><td colSpan={4} className='text-center py-4 text-slate-500'>Không có dữ liệu bán hàng trong thời gian này</td></tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Detailed Data Table */}
          <Card className='card-surface'>
            <Card.Body className='p-4'>
              <div className='d-flex justify-content-between align-items-center mb-4'>
                <h3 className='text-lg font-bold mb-0'>Dữ liệu bán hàng chi tiết</h3>
                <span className='text-sm text-slate-500'>Hiển thị {data.detailedData.length} giao dịch gần nhất</span>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <Table responsive hover className='mb-0' size='sm'>
                  <thead className='sticky-top bg-white'>
                    <tr>
                      <th className='p-2'>Ngày</th>
                      <th>Sản phẩm</th>
                      <th>Danh mục</th>
                      <th className='text-center'>SL</th>
                      <th className='text-end'>Đơn giá</th>
                      <th className='text-end'>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detailedData.map((item) => (
                      <tr key={item._id}>
                        <td className='p-2 text-sm text-slate-500'>{format(new Date(item.date), 'dd/MM/yyyy HH:mm')}</td>
                        <td className='text-sm truncate max-w-[200px]'>{item.product_name}</td>
                        <td className='text-sm'><span className='badge bg-slate-100 text-slate-600'>{item.category}</span></td>
                        <td className='text-sm text-center'>{item.quantity}</td>
                        <td className='text-sm text-end'><PriceText value={item.unit_price} /></td>
                        <td className='text-sm text-end font-bold text-slate-700'><PriceText value={item.total_revenue} /></td>
                      </tr>
                    ))}
                    {data.detailedData.length === 0 && (
                      <tr><td colSpan={6} className='text-center py-4 text-slate-500'>Không có dữ liệu</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </DashboardLayout>
  )
}

export default RevenueAnalyticsPage

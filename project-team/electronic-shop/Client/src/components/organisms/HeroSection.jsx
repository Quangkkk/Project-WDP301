import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { Link } from 'react-router-dom'
import Button from '../atoms/Button'
import PageBadge from '../atoms/PageBadge'

function HeroSection() {
  return (
    <section className='page-section overflow-hidden'>
      <Container>
        <Row className='g-5 align-items-center'>
          <Col lg={6}>
            <PageBadge>Online Technology Sale System</PageBadge>
            <h1 className='mb-4 text-5xl font-black tracking-tight text-slate-950 md:text-6xl'>Mua đồ công nghệ nhanh, rõ ràng và dễ quản lý.</h1>
            <div className='d-flex flex-wrap gap-3'>
              <Link to='/products'><Button>Mua Ngay</Button></Link>
            </div>
          </Col>
          <Col lg={6}>
            <div className='relative !rounded-[40px] bg-slate-950 p-4 shadow-2xl'>
              <div className='!rounded-[32px] bg-white p-4'>
                <div className='mb-3 d-flex gap-2'><span className='h-3 w-3 !rounded-full bg-red-400'></span><span className='h-3 w-3 !rounded-full bg-yellow-400'></span><span className='h-3 w-3 !rounded-full bg-green-400'></span></div>
                <div className='!rounded-[24px] bg-gradient-to-br from-blue-50 to-slate-100 p-4'>
                  <div className='mb-4 !rounded-4 bg-white p-4 shadow-sm'><p className='mb-1 text-sm font-bold text-slate-400'>Monthly Sales</p><h3 className='mb-0 text-3xl font-black text-blue-600'>45,280,000 ₫</h3></div>
                  <div className='grid grid-cols-2 gap-3'>
                    {['MacBook', 'iPhone', 'Headphone', 'Keyboard'].map((item) => <div key={item} className='!rounded-4 bg-white p-3 shadow-sm'><div className='mb-2 flex h-16 items-center justify-center !rounded-4 bg-slate-100 text-3xl'>💻</div><p className='mb-0 text-sm font-black text-slate-700'>{item}</p></div>)}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  )
}

export default HeroSection

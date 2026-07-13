import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import BrandLogo from '../atoms/BrandLogo'

function Footer() {
  return (
    <footer id='contact' className='border-top bg-white py-5'>
      <Container>
        <Row className='g-4 align-items-start'>
          <Col lg={5}>
            <BrandLogo />
            <p className='mt-3 mb-0 max-w-xl text-sm leading-6 text-slate-500'>Online Technology Sale System dùng React, Tailwind, React Bootstrap và NodeJS để quản lý mua hàng công nghệ, giỏ hàng, đơn hàng và hỗ trợ khách hàng.</p>
          </Col>
          <Col md={4} lg={2}><h6 className='font-black text-slate-950'>Shop</h6><p className='mb-1 text-sm text-slate-500'>Products</p><p className='mb-1 text-sm text-slate-500'>Categories</p></Col>
          <Col md={4} lg={2}><h6 className='font-black text-slate-950'>Support</h6><p className='mb-1 text-sm text-slate-500'>Tickets</p><p className='mb-1 text-sm text-slate-500'>Order status</p></Col>
          <Col md={4} lg={3}><h6 className='font-black text-slate-950'>Demo</h6><p className='mb-1 text-sm text-slate-500'>customer@example.com</p><p className='mb-0 text-sm text-slate-500'>admin@example.com</p></Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer

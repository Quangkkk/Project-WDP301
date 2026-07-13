import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import MainLayout from './MainLayout'
import AdminSidebar from '../molecules/AdminSidebar'

function DashboardLayout({ title, description, children }) {
  return (
    <MainLayout>
      <section className='py-5'>
        <Container>
          <Row className='g-4'>
            <Col lg={3}><AdminSidebar /></Col>
            <Col lg={9}>
              <div className='mb-4'>
                <p className='mb-2 text-sm font-black uppercase tracking-[0.25em] text-blue-600'>Management</p>
                <h1 className='mb-2 text-4xl font-black text-slate-950'>{title}</h1>
                {description && <p className='mb-0 text-slate-500'>{description}</p>}
              </div>
              {children}
            </Col>
          </Row>
        </Container>
      </section>
    </MainLayout>
  )
}

export default DashboardLayout

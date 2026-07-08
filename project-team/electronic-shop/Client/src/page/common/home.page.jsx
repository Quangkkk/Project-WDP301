import { useEffect, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { Link } from 'react-router-dom'
import MainLayout from '../../components/templates/MainLayout'
import HeroSection from '../../components/organisms/HeroSection'
import ProductGrid from '../../components/organisms/ProductGrid'
import SectionHeading from '../../components/molecules/SectionHeading'
import Button from '../../components/atoms/Button'
import Alert from '../../components/atoms/Alert'
import EmptyState from '../../components/atoms/EmptyState'
import { getCategories, getProducts } from '../../services/product.service'
import { getErrorMessage } from '../../services/api'
import { getId, pickArray } from '../../utils/format'

const categoryIcons = ['💻', '📱', '🎧', '⌨️']

function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError('')

        const [productRes, categoryRes] = await Promise.all([
          getProducts({ featured: true, status: 'active' }),
          getCategories({ status: 'active' }),
        ])

        if (!mounted) return
        setProducts(pickArray(productRes, []))
        setCategories(pickArray(categoryRes, []))
      } catch (error) {
        if (!mounted) return
        setProducts([])
        setCategories([])
        setError(getErrorMessage(error, 'Không tải được dữ liệu từ backend. Hãy kiểm tra Server có đang chạy ở http://localhost:8080 không.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  return (
    <MainLayout>
      <HeroSection />

      <section className='page-section bg-white' id='categories'>
        <Container>
          <SectionHeading eyebrow='Categories' title='Danh mục nổi bật' description='Dữ liệu category được lấy trực tiếp từ backend.' />
          <Alert type='danger'>{error}</Alert>
          {categories.length === 0 && !isLoading ? (
            <EmptyState icon='📂' title='Chưa có category từ backend' description='Hãy thêm category trong database hoặc tạo ở trang admin.' />
          ) : (
            <Row className='g-4'>
              {categories.slice(0, 4).map((category, index) => (
                <Col md={6} lg={3} key={getId(category) || category.name}>
                  <Link to={`/products?categoryId=${getId(category)}`} className='text-decoration-none'>
                    <div className='card-surface h-100 p-4 transition hover:-translate-y-1'>
                      <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-4 bg-blue-50 text-3xl'>{categoryIcons[index % categoryIcons.length]}</div>
                      <h3 className='mb-2 text-xl font-black text-slate-950'>{category.name}</h3>
                      <p className='mb-0 text-sm leading-6 text-slate-500'>Xem sản phẩm trong danh mục {category.name}.</p>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      <section className='page-section'>
        <Container>
          <SectionHeading
            eyebrow='Featured products'
            title='Sản phẩm nổi bật'
            description='Dữ liệu sản phẩm được lấy từ API /product?featured=true&status=active.'
            action={<Link to='/products'><Button variant='secondary'>View all</Button></Link>}
          />
          <ProductGrid products={products.slice(0, 6)} isLoading={isLoading} />
        </Container>
      </section>
    </MainLayout>
  )
}

export default HomePage

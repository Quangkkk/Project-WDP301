import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ProductCard from '../molecules/ProductCard'
import EmptyState from '../atoms/EmptyState'
import LoadingText from '../atoms/LoadingText'

function ProductGrid({ products, isLoading }) {
  if (isLoading) return <LoadingText>Đang tải sản phẩm...</LoadingText>
  if (!products?.length) return <EmptyState icon='🔎' title='Không tìm thấy sản phẩm' description='Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.' />

  return (
    <Row className='g-4'>
      {products.map((product) => <Col md={6} xl={4} key={product._id || product.id}><ProductCard product={product} /></Col>)}
    </Row>
  )
}

export default ProductGrid

import Card from 'react-bootstrap/Card'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from '../atoms/Button'
import SelectField from '../atoms/SelectField'
import TextField from '../atoms/TextField'
import { getId } from '../../utils/format'

function ProductFilterBar({ filters, categories, brands, onFilterChange, onResetFilters }) {
  const categoryOptions = [{ value: '', label: 'Tất cả danh mục' }, ...categories.map((item) => ({ value: getId(item), label: item.name }))]
  const brandOptions = [{ value: '', label: 'Tất cả thương hiệu' }, ...brands.map((item) => ({ value: getId(item), label: item.name }))]
  const sortOptions = [
    { value: 'latest', label: 'Mới nhất' },
    { value: 'name-asc', label: 'Tên A-Z' },
    { value: 'price-asc', label: 'Giá thấp đến cao' },
    { value: 'price-desc', label: 'Giá cao đến thấp' },
    { value: 'rating-desc', label: 'Đánh giá cao nhất' },
  ]

  return (
    <Card className='card-surface mb-4'>
      <Card.Body className='p-4'>
        <Row className='g-3 align-items-end'>
          <Col lg={4}><TextField label='Tìm kiếm sản phẩm' id='keyword' placeholder='Laptop, điện thoại, phụ kiện...' value={filters.keyword} onChange={(e) => onFilterChange('keyword', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Danh mục' id='categoryId' value={filters.categoryId} options={categoryOptions} onChange={(e) => onFilterChange('categoryId', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Thương hiệu' id='brandId' value={filters.brandId} options={brandOptions} onChange={(e) => onFilterChange('brandId', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Sắp xếp' id='sortBy' value={filters.sortBy} options={sortOptions} onChange={(e) => onFilterChange('sortBy', e.target.value)} /></Col>
          <Col md={6} lg={2}><Button variant='secondary' className='w-100 py-3' onClick={onResetFilters}>Đặt lại</Button></Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default ProductFilterBar
